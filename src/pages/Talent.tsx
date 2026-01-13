import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Briefcase, 
  FileText, 
  Search, 
  Plus, 
  UserPlus,
  TrendingUp,
  Clock,
  DollarSign
} from 'lucide-react';
import { useFreelancers, FreelancerProfile } from '@/hooks/useFreelancers';
import { useJobPostings, JobPosting } from '@/hooks/useJobPostings';
import { useContracts, Contract } from '@/hooks/useContracts';
import { FreelancerCard } from '@/components/talent/FreelancerCard';
import { JobPostingCard } from '@/components/talent/JobPostingCard';
import { ContractCard } from '@/components/talent/ContractCard';
import { JobPostingForm } from '@/components/talent/JobPostingForm';
import { FreelancerProfileForm } from '@/components/talent/FreelancerProfileForm';

export default function Talent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showJobForm, setShowJobForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | undefined>();
  
  const { freelancers, myProfile, isLoading: loadingFreelancers } = useFreelancers();
  const { jobPostings, myJobPostings, isLoading: loadingJobs } = useJobPostings();
  const { businessContracts, freelancerContracts, isLoading: loadingContracts, updateContract } = useContracts();

  const filteredFreelancers = freelancers.filter(f => 
    f.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredJobs = jobPostings.filter(j =>
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.skills_required.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allContracts = [...businessContracts, ...freelancerContracts];
  const activeContracts = allContracts.filter(c => c.status === 'active');

  const stats = [
    { label: 'Active Contracts', value: activeContracts.length, icon: FileText, color: 'text-blue-500' },
    { label: 'Open Jobs', value: jobPostings.filter(j => j.status === 'open').length, icon: Briefcase, color: 'text-green-500' },
    { label: 'Available Talent', value: freelancers.filter(f => f.availability === 'available').length, icon: Users, color: 'text-purple-500' },
    { label: 'Total Spent', value: `KES ${businessContracts.reduce((acc, c) => acc + c.total_paid, 0).toLocaleString()}`, icon: DollarSign, color: 'text-yellow-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Talent Marketplace</h1>
            <p className="text-muted-foreground">Find freelancers, post jobs, and manage contracts</p>
          </div>
          <div className="flex gap-2">
            {!myProfile && (
              <Button variant="outline" onClick={() => setShowProfileForm(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Become a Freelancer
              </Button>
            )}
            <Button onClick={() => { setEditingJob(undefined); setShowJobForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Post a Job
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="freelancers" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="freelancers" className="gap-2">
                <Users className="h-4 w-4" />
                Freelancers
              </TabsTrigger>
              <TabsTrigger value="jobs" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Jobs
              </TabsTrigger>
              <TabsTrigger value="my-jobs" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                My Jobs
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-2">
                <FileText className="h-4 w-4" />
                Contracts
              </TabsTrigger>
            </TabsList>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Freelancers Tab */}
          <TabsContent value="freelancers" className="space-y-4">
            {loadingFreelancers ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredFreelancers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No freelancers found</h3>
                  <p className="text-muted-foreground">Be the first to create a freelancer profile!</p>
                  {!myProfile && (
                    <Button className="mt-4" onClick={() => setShowProfileForm(true)}>
                      Create Profile
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFreelancers.map(freelancer => (
                  <FreelancerCard
                    key={freelancer.id}
                    freelancer={freelancer}
                    onViewProfile={() => {}}
                    onHire={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {loadingJobs ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-40 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredJobs.filter(j => j.status === 'open').length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No open jobs</h3>
                  <p className="text-muted-foreground">Check back later for new opportunities</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredJobs.filter(j => j.status === 'open').map(job => (
                  <JobPostingCard
                    key={job.id}
                    job={job}
                    onViewDetails={() => {}}
                    onApply={() => {}}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Jobs Tab */}
          <TabsContent value="my-jobs" className="space-y-4">
            {myJobPostings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No job postings yet</h3>
                  <p className="text-muted-foreground">Create your first job posting to find talent</p>
                  <Button className="mt-4" onClick={() => setShowJobForm(true)}>
                    Post a Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {myJobPostings.map(job => (
                  <JobPostingCard
                    key={job.id}
                    job={job}
                    isOwner
                    onViewDetails={() => {}}
                    onEdit={(j) => { setEditingJob(j); setShowJobForm(true); }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            {loadingContracts ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-40 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : allContracts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No contracts yet</h3>
                  <p className="text-muted-foreground">Contracts will appear here when you hire freelancers</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {allContracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onViewDetails={() => {}}
                    onUpdateStatus={(c, status) => updateContract.mutate({ id: c.id, status })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <JobPostingForm
        open={showJobForm}
        onClose={() => { setShowJobForm(false); setEditingJob(undefined); }}
        editingJob={editingJob}
      />
      
      <FreelancerProfileForm
        open={showProfileForm}
        onClose={() => setShowProfileForm(false)}
        existingProfile={myProfile}
      />
    </DashboardLayout>
  );
}
