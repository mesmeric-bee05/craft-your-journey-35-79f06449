import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Heart, ExternalLink } from 'lucide-react';

const CRISIS_RESOURCES = [
  { name: 'Befrienders Kenya', phone: '0800 723 253', available: '24/7, free', url: 'tel:0800723253' },
  { name: 'Kenya Red Cross Psychosocial', phone: '+254 703 037 000', available: '24/7', url: 'tel:+254703037000' },
  { name: 'AMREF Health Africa', phone: '0800 720 021', available: '24/7, free', url: 'tel:0800720021' },
];

export function CrisisButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl gap-2"
      >
        <Heart className="w-4 h-4" />
        Ninahitaji msaada wa haraka
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Uko salama. Tuko hapa. 💛
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-center text-muted-foreground text-sm">
              Nimesikia unachosema, na ninakushukuru kwa ujasiri wa kuniambia.
              Sasa hivi, mtu mmoja anaweza kukusaidia — na naomba uwasiliane nao.
            </p>

            {CRISIS_RESOURCES.map((r) => (
              <a
                key={r.name}
                href={r.url}
                className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:bg-muted/50 transition-all"
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{r.name}</p>
                  <p className="text-sm text-muted-foreground">{r.phone} · {r.available}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            ))}

            <a
              href="https://www.kenyanmentalhealth.org/find-help"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-primary hover:underline mt-4"
            >
              Pata mshauri wa karibu nawe →
            </a>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Nguvu zako ni zaidi ya unavyoona. Umefika mbali. Endelea. 💛
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
