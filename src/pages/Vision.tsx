import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, Sparkles, Loader2, Download, Image as ImageIcon, Wand2, Palette, GitCompare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { BeforeAfterSlider } from '@/components/ui/before-after-slider';

const BACKGROUNDS = [
  { value: 'white-studio', label: 'White Studio', description: 'Clean professional background' },
  { value: 'nairobi-outdoor', label: 'Nairobi Outdoor', description: 'Warm Kenyan cityscape' },
  { value: 'market-scene', label: 'Market Scene', description: 'Vibrant local market aesthetic' },
  { value: 'gradient-modern', label: 'Modern Gradient', description: 'Contemporary color splash' },
  { value: 'wooden-table', label: 'Wooden Table', description: 'Rustic flat-lay style' },
  { value: 'custom-brand', label: 'Brand Colors', description: 'Uses your brand palette' },
];

export default function Vision() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [background, setBackground] = useState('white-studio');
  const [enhancing, setEnhancing] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const { user } = useAuth();
  const prefKey = user?.id ? `vision:compareMode:${user.id}` : null;
  const [compareMode, setCompareMode] = useState(false);

  // Load remembered preference per user
  useEffect(() => {
    if (!prefKey) return;
    try {
      const saved = localStorage.getItem(prefKey);
      if (saved !== null) setCompareMode(saved === '1');
    } catch { /* ignore */ }
  }, [prefKey]);

  const handleCompareModeChange = (next: boolean) => {
    setCompareMode(next);
    if (prefKey) {
      try { localStorage.setItem(prefKey, next ? '1' : '0'); } catch { /* ignore */ }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
    setSelectedFile(file);
    setEnhancedResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const enhanceProduct = async () => {
    if (!selectedFile) return;
    setEnhancing(true);
    try {
      const bgLabel = BACKGROUNDS.find(b => b.value === background)?.label || 'White Studio';
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: `Generate a professional product photography description for a Kenyan SME. Product: ${productName || 'product'} on a ${bgLabel} background. Describe the ideal lighting, angles, and composition that would make this product sell well on Instagram and WhatsApp. Include specific photography tips for phone cameras. Keep it actionable (5 tips).`,
          type: 'product_photo_tips',
        },
      });
      if (error) throw error;
      setEnhancedResult(data?.content || data?.text || 'Enhancement tips generated.');
      toast.success('Product photography tips generated!');
    } catch {
      toast.error('Enhancement failed. Try again.');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            SmartReach Vision
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered product photography — studio-quality images from your phone camera.
          </p>
        </div>

        {/* Compare toggle */}
        {preview && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <GitCompare className="w-4 h-4 text-primary" />
              Interactive before / after comparison
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{compareMode ? 'On' : 'Off'}</span>
              <Switch checked={compareMode} onCheckedChange={setCompareMode} aria-label="Toggle compare slider" />
            </div>
          </div>
        )}

        {compareMode && preview ? (
          <BeforeAfterSlider
            beforeSrc={preview}
            afterOverlay={
              enhancedResult ? (
                <div className="max-w-md text-center space-y-3">
                  <Sparkles className="w-8 h-8 mx-auto text-accent" />
                  <p className="text-sm text-foreground whitespace-pre-line">{enhancedResult}</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Wand2 className="w-8 h-8 mx-auto text-primary opacity-50" />
                  <p className="text-sm text-muted-foreground">Run AI Enhance to populate this side</p>
                </div>
              )
            }
            beforeLabel="Before"
            afterLabel="After"
          />
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BEFORE: Upload Section */}
          <Card className="border-primary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="w-5 h-5" />
                  Before — Your Photo
                </CardTitle>
                <Badge variant="outline" className="text-xs">Original</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Click to upload a product photo</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                  </div>
                )}
                <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="e.g., Leather Handbag, Fresh Juice, Hair Product"
                    className="w-full mt-1 px-3 py-2 rounded-lg border bg-background text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Background Style</label>
                  <Select value={background} onValueChange={setBackground}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BACKGROUNDS.map(bg => (
                        <SelectItem key={bg.value} value={bg.value}>
                          <div>
                            <span className="font-medium">{bg.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{bg.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={enhanceProduct} disabled={!selectedFile || enhancing} className="w-full gap-2">
                  {enhancing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating tips...</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> AI Enhance & Get Tips</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AFTER: Result Section */}
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-accent" />
                  After — AI Photography Tips
                </CardTitle>
                <Badge variant="secondary" className="text-xs">AI Enhanced</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {enhancedResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-sm text-foreground whitespace-pre-line">{enhancedResult}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">Phone-optimized</Badge>
                    <Badge variant="secondary" className="text-xs">Kenyan Market</Badge>
                    <Badge variant="secondary" className="text-xs">Social Ready</Badge>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Palette className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Upload a product photo to get AI-powered photography tips</p>
                  <p className="text-xs mt-1">Get studio-quality composition advice tailored for Kenyan market platforms</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Camera className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Background Removal</p>
                <p className="text-xs text-muted-foreground">AI removes messy backgrounds</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Lighting Correction</p>
                <p className="text-xs text-muted-foreground">Professional studio lighting</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Download className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Social-Ready Export</p>
                <p className="text-xs text-muted-foreground">Optimized for IG, WhatsApp, TikTok</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
