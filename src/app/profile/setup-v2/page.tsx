'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Check, Zap, Upload, X, Plus } from 'lucide-react';

const STEPS = [
  'Basic Info',
  'Resume Upload',
  'Skills',
  'Experience',
  'Education',
  'Certifications',
  'Job Preferences',
  'Complete',
];

export default function CompleteProfileWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    full_name: '',
    phone: '',
    location: '',
    linkedin_url: '',
    portfolio_url: '',
    bio: '',
  });

  // Step 2: Resume
  const [resume, setResume] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');

  // Step 3: Skills
  const [skills, setSkills] = useState<Array<{ name: string; level: string; years: number }>>([]);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'intermediate', years: 1 });

  // Step 4: Experience
  const [experiences, setExperiences] = useState<Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>>([]);

  // Step 5: Education
  const [education, setEducation] = useState<Array<{
    degree: string;
    institution: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }>>([]);

  // Step 6: Certifications
  const [certifications, setCertifications] = useState<Array<{
    name: string;
    organization: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
  }>>([]);

  // Step 7: Job Preferences
  const [preferences, setPreferences] = useState({
    job_titles: [] as string[],
    locations: [] as string[],
    job_types: [] as string[],
    work_modes: [] as string[],
    min_salary: '',
    max_salary: '',
  });

  const handleStep1Submit = async () => {
    if (!basicInfo.full_name) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('candidate_profiles')
        .upsert({
          user_id: user.id,
          ...basicInfo,
        })
        .select()
        .single();

      if (error) throw error;

      setProfileId(profile.id);
      toast.success('Basic info saved!');
      setCurrentStep(1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resume) {
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to Supabase Storage
      const fileExt = resume.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, resume, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Update profile with resume URL
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update({ resume_url: urlData.publicUrl })
        .eq('id', profileId);

      if (updateError) throw updateError;

      setResumeUrl(urlData.publicUrl);
      toast.success('Resume uploaded successfully!');
      setCurrentStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload resume');
    } finally {
      setLoading(false);
    }
  };

  const handleSkillsSubmit = async () => {
    if (skills.length === 0) {
      toast.error('Please add at least one skill');
      return;
    }

    setLoading(true);
    try {
      const skillsToInsert = skills.map((skill) => ({
        profile_id: profileId,
        skill_name: skill.name,
        proficiency_level: skill.level,
        years_of_experience: skill.years,
      }));

      const { error } = await supabase
        .from('skills')
        .upsert(skillsToInsert, { onConflict: 'profile_id,skill_name' });

      if (error) throw error;

      toast.success('Skills saved!');
      setCurrentStep(3);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save skills');
    } finally {
      setLoading(false);
    }
  };

  const handleExperienceSubmit = async () => {
    if (experiences.length === 0) {
      setCurrentStep(4);
      return;
    }

    setLoading(true);
    try {
      const experienceToInsert = experiences.map((exp) => ({
        profile_id: profileId,
        job_title: exp.title,
        company_name: exp.company,
        location: exp.location,
        start_date: exp.startDate,
        end_date: exp.current ? null : exp.endDate,
        is_current: exp.current,
        description: exp.description,
      }));

      const { error } = await supabase
        .from('experience')
        .insert(experienceToInsert);

      if (error) throw error;

      toast.success('Experience saved!');
      setCurrentStep(4);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save experience');
    } finally {
      setLoading(false);
    }
  };

  const handleEducationSubmit = async () => {
    if (education.length === 0) {
      setCurrentStep(5);
      return;
    }

    setLoading(true);
    try {
      const educationToInsert = education.map((edu) => ({
        profile_id: profileId,
        degree: edu.degree,
        institution_name: edu.institution,
        field_of_study: edu.field,
        start_date: edu.startDate,
        end_date: edu.endDate,
        gpa: edu.gpa ? parseFloat(edu.gpa) : null,
      }));

      const { error } = await supabase
        .from('education')
        .insert(educationToInsert);

      if (error) throw error;

      toast.success('Education saved!');
      setCurrentStep(5);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save education');
    } finally {
      setLoading(false);
    }
  };

  const handleCertificationsSubmit = async () => {
    if (certifications.length === 0) {
      setCurrentStep(6);
      return;
    }

    setLoading(true);
    try {
      const certsToInsert = certifications.map((cert) => ({
        profile_id: profileId,
        certification_name: cert.name,
        issuing_organization: cert.organization,
        issue_date: cert.issueDate,
        expiry_date: cert.expiryDate || null,
        credential_id: cert.credentialId || null,
      }));

      const { error } = await supabase
        .from('certifications')
        .insert(certsToInsert);

      if (error) throw error;

      toast.success('Certifications saved!');
      setCurrentStep(6);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save certifications');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('job_preferences')
        .upsert({
          profile_id: profileId,
          job_titles: preferences.job_titles,
          locations: preferences.locations,
          job_types: preferences.job_types,
          work_modes: preferences.work_modes,
          salary_min: preferences.min_salary ? parseFloat(preferences.min_salary) : null,
          salary_max: preferences.max_salary ? parseFloat(preferences.max_salary) : null,
        });

      if (error) throw error;

      toast.success('Profile setup complete!');
      setCurrentStep(7);
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.name) {
      toast.error('Please enter skill name');
      return;
    }
    setSkills([...skills, newSkill]);
    setNewSkill({ name: '', level: 'intermediate', years: 1 });
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={basicInfo.full_name}
              onChange={(e) => setBasicInfo({ ...basicInfo, full_name: e.target.value })}
              placeholder="John Doe"
              required
            />
            <Input
              label="Phone Number"
              value={basicInfo.phone}
              onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
            <Input
              label="Location"
              value={basicInfo.location}
              onChange={(e) => setBasicInfo({ ...basicInfo, location: e.target.value })}
              placeholder="San Francisco, CA"
            />
            <Input
              label="LinkedIn URL"
              value={basicInfo.linkedin_url}
              onChange={(e) => setBasicInfo({ ...basicInfo, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/johndoe"
            />
            <Input
              label="Portfolio URL"
              value={basicInfo.portfolio_url}
              onChange={(e) => setBasicInfo({ ...basicInfo, portfolio_url: e.target.value })}
              placeholder="https://johndoe.com"
            />
            <Textarea
              label="Professional Bio"
              value={basicInfo.bio}
              onChange={(e) => setBasicInfo({ ...basicInfo, bio: e.target.value })}
              placeholder="Brief professional summary..."
              rows={4}
            />
            <Button onClick={handleStep1Submit} disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <span className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Upload Resume
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResume(e.target.files?.[0] || null)}
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">PDF, DOC, or DOCX (max 5MB)</p>
              {resume && (
                <p className="text-sm text-green-600 mt-2 flex items-center justify-center">
                  <Check className="h-4 w-4 mr-1" />
                  {resume.name}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setCurrentStep(0)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleResumeUpload} disabled={loading} className="flex-1">
                {loading ? 'Uploading...' : resume ? 'Upload & Continue' : 'Skip'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Skill Name"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                placeholder="React"
              />
              <Select
                label="Proficiency"
                value={newSkill.level}
                onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </Select>
              <div>
                <Label>Years</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={newSkill.years}
                    onChange={(e) => setNewSkill({ ...newSkill, years: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="50"
                  />
                  <Button onClick={addSkill} size="sm" type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[60px] border border-gray-200 rounded-lg p-3">
              {skills.length === 0 ? (
                <p className="text-sm text-gray-500">No skills added yet</p>
              ) : (
                skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{skill.name} ({skill.level}, {skill.years}y)</span>
                    <button onClick={() => removeSkill(index)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSkillsSubmit} disabled={loading} className="flex-1">
                {loading ? 'Saving...' : 'Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
      case 4:
      case 5:
        return (
          <div className="text-center py-8">
            <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Quick Setup</h3>
            <p className="text-gray-600 mb-6">
              You can add {STEPS[currentStep].toLowerCase()} later from your profile settings.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1"
              >
                Skip for Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Desired Job Titles (comma-separated)"
                value={preferences.job_titles.join(', ')}
                onChange={(e) => setPreferences({
                  ...preferences,
                  job_titles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                placeholder="Software Engineer, Full Stack Developer"
              />
              <Input
                label="Preferred Locations (comma-separated)"
                value={preferences.locations.join(', ')}
                onChange={(e) => setPreferences({
                  ...preferences,
                  locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                placeholder="Remote, San Francisco, New York"
              />
              <Input
                label="Minimum Salary"
                type="number"
                value={preferences.min_salary}
                onChange={(e) => setPreferences({ ...preferences, min_salary: e.target.value })}
                placeholder="100000"
              />
              <Input
                label="Maximum Salary"
                type="number"
                value={preferences.max_salary}
                onChange={(e) => setPreferences({ ...preferences, max_salary: e.target.value })}
                placeholder="180000"
              />
            </div>

            <div>
              <Label>Job Types</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['full-time', 'part-time', 'contract', 'internship'].map((type) => (
                  <Checkbox
                    key={type}
                    checked={preferences.job_types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPreferences({ ...preferences, job_types: [...preferences.job_types, type] });
                      } else {
                        setPreferences({ ...preferences, job_types: preferences.job_types.filter(t => t !== type) });
                      }
                    }}
                    label={type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Work Modes</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['remote', 'hybrid', 'onsite'].map((mode) => (
                  <Checkbox
                    key={mode}
                    checked={preferences.work_modes.includes(mode)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPreferences({ ...preferences, work_modes: [...preferences.work_modes, mode] });
                      } else {
                        setPreferences({ ...preferences, work_modes: preferences.work_modes.filter(m => m !== mode) });
                      }
                    }}
                    label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                  />
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setCurrentStep(5)} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handlePreferencesSubmit} disabled={loading} className="flex-1">
                {loading ? 'Saving...' : 'Complete Setup'}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Profile Complete!</h3>
            <p className="text-gray-600 mb-6">
              Redirecting to your dashboard...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <Zap className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold gradient-text">AutoApply.ai</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Let's set up your job search automation</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div key={step} className="flex-1">
                <div className="relative flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index <= currentStep
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
                  </div>
                  <span className="text-xs mt-2 text-center hidden sm:block">{step}</span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`absolute top-5 left-1/2 w-full h-0.5 ${
                        index < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      style={{ zIndex: -1 }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <Card>
          <CardHeader>
            <CardTitle>Step {currentStep + 1}: {STEPS[currentStep]}</CardTitle>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
