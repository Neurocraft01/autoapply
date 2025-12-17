import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseResume } from '@/lib/resume/parser';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are allowed' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('resumes')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('resumes')
      .getPublicUrl(filePath);

    // Parse resume - create a File object from buffer
    const resumeFile = new File([buffer], file.name, { type: file.type });
    const parsedData = await parseResume(resumeFile);

    // Update profile with resume URL and parsed data
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      await supabaseAdmin
        .from('candidate_profiles')
        .update({
          resume_url: urlData.publicUrl,
          full_name: parsedData.name || undefined,
          phone: parsedData.phone || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      // Add parsed skills
      if (parsedData.skills && parsedData.skills.length > 0) {
        const skillsToInsert = parsedData.skills.map((skill) => ({
          profile_id: profile.id,
          skill_name: skill,
          proficiency_level: 'intermediate',
        }));

        await supabaseAdmin
          .from('skills')
          .upsert(skillsToInsert, { onConflict: 'profile_id,skill_name' });
      }

      // Add parsed experience
      if (parsedData.experience && parsedData.experience.length > 0) {
        const experienceToInsert = parsedData.experience.map((exp: any) => ({
          profile_id: profile.id,
          job_title: exp.position || exp.job_title,
          company_name: exp.company_name || exp.company,
          start_date: exp.start_date,
          end_date: exp.end_date,
          is_current: exp.is_current || false,
          description: exp.description,
        }));

        await supabaseAdmin.from('experience').insert(experienceToInsert);
      }

      // Add parsed education
      if (parsedData.education && parsedData.education.length > 0) {
        const educationToInsert = parsedData.education.map((edu: any) => ({
          profile_id: profile.id,
          institution_name: edu.institution,
          degree: edu.degree,
          field_of_study: edu.field_of_study || edu.field,
          start_date: edu.start_date,
          end_date: edu.end_date,
        }));

        await supabaseAdmin.from('education').insert(educationToInsert);
      }
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      parsed: parsedData,
    });
  } catch (error: any) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
