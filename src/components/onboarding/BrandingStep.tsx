import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePlus, Palette, Upload, X } from 'lucide-react';
import type { BrandingDetails } from '@/hooks/useOnboarding';
import { cn } from '@/lib/utils';

interface BrandingStepProps {
  details: BrandingDetails;
  onUpdate: (details: Partial<BrandingDetails>) => void;
  onUpload: (file: File, type: 'logo' | 'cover') => Promise<string | null>;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function BrandingStep({
  details,
  onUpdate,
  onUpload,
  onNext,
  onBack,
  isLoading,
}: BrandingStepProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(type);
    await onUpload(file, type);
    setUploading(null);
  };

  const removeImage = (type: 'logo' | 'cover') => {
    if (type === 'logo') {
      onUpdate({ logoUrl: null });
    } else {
      onUpdate({ coverImageUrl: null });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5" />
            Business Logo & Cover
          </CardTitle>
          <CardDescription>
            Upload your brand assets for a professional appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Logo</Label>
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors hover:border-primary',
                  details.logoUrl ? 'border-solid border-muted' : 'border-muted-foreground/25'
                )}
                onClick={() => logoInputRef.current?.click()}
              >
                {details.logoUrl ? (
                  <img
                    src={details.logoUrl}
                    alt="Your business logo preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : uploading === 'logo' ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'logo')}
              />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Upload a square logo (recommended 512x512px)
                </p>
                {details.logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-destructive"
                    onClick={() => removeImage('logo')}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-3">
            <Label>Cover Image</Label>
            <div
              className={cn(
                'w-full h-40 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors hover:border-primary relative overflow-hidden',
                details.coverImageUrl ? 'border-solid border-muted' : 'border-muted-foreground/25'
              )}
              onClick={() => coverInputRef.current?.click()}
            >
              {details.coverImageUrl ? (
                <>
                  <img
                    src={details.coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage('cover');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </>
              ) : uploading === 'cover' ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Upload cover image (recommended 1200x400px)
                  </p>
                </div>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'cover')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Choose colors that represent your brand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primaryColor"
                  type="color"
                  className="w-12 h-10 p-1 cursor-pointer"
                  value={details.primaryColor}
                  onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                />
                <Input
                  value={details.primaryColor}
                  onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="secondaryColor"
                  type="color"
                  className="w-12 h-10 p-1 cursor-pointer"
                  value={details.secondaryColor}
                  onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                />
                <Input
                  value={details.secondaryColor}
                  onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="mt-4 p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-10 rounded-md shadow-sm"
                style={{ backgroundColor: details.primaryColor }}
              />
              <div
                className="w-16 h-10 rounded-md shadow-sm"
                style={{ backgroundColor: details.secondaryColor }}
              />
              <div
                className="flex-1 h-10 rounded-md shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${details.primaryColor}, ${details.secondaryColor})`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onNext} disabled={isLoading} size="lg">
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
