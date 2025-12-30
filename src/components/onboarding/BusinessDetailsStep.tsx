import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { BusinessDetails } from '@/hooks/useOnboarding';

interface BusinessDetailsStepProps {
  details: BusinessDetails;
  onUpdate: (details: Partial<BusinessDetails>) => void;
  onNext: () => void;
  isLoading: boolean;
}

const industries = [
  'Technology',
  'Retail',
  'Food & Beverage',
  'Healthcare',
  'Finance',
  'Education',
  'Entertainment',
  'Real Estate',
  'Transportation',
  'Agriculture',
  'Manufacturing',
  'Other',
];

const businessTypes = [
  { value: 'retail', label: 'Retail Store' },
  { value: 'restaurant', label: 'Restaurant/Cafe' },
  { value: 'service', label: 'Service Provider' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'other', label: 'Other' },
];

export function BusinessDetailsStep({
  details,
  onUpdate,
  onNext,
  isLoading,
}: BusinessDetailsStepProps) {
  const isValid = details.name && details.email && details.businessType;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Tell us about your business to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                placeholder="Enter your business name"
                value={details.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={details.industry}
                onValueChange={(value) => onUpdate({ industry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry.toLowerCase()}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type *</Label>
            <Select
              value={details.businessType}
              onValueChange={(value: any) => onUpdate({ businessType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your business..."
              value={details.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            How can customers reach you?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Business Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@business.com"
                  className="pl-10"
                  value={details.email}
                  onChange={(e) => onUpdate({ email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+254 700 000 000"
                  className="pl-10"
                  value={details.phone}
                  onChange={(e) => onUpdate({ phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                placeholder="https://www.yourbusiness.com"
                className="pl-10"
                value={details.website}
                onChange={(e) => onUpdate({ website: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </CardTitle>
          <CardDescription>
            Where is your business located?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Street address"
              value={details.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="City"
                value={details.city}
                onChange={(e) => onUpdate({ city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Country"
                value={details.country}
                onChange={(e) => onUpdate({ country: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isValid || isLoading} size="lg">
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
