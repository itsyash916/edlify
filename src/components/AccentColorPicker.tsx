import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { name: "Electric Blue", h: 217, s: 91, l: 60 },
  { name: "Neon Purple", h: 262, s: 83, l: 58 },
  { name: "Emerald", h: 160, s: 84, l: 39 },
  { name: "Sunset Orange", h: 25, s: 95, l: 53 },
  { name: "Hot Pink", h: 330, s: 81, l: 60 },
  { name: "Cyber Yellow", h: 50, s: 100, l: 50 },
  { name: "Ice Blue", h: 195, s: 100, l: 50 },
  { name: "Crimson", h: 348, s: 83, l: 47 },
  { name: "Lime Green", h: 120, s: 100, l: 40 },
  { name: "Royal Purple", h: 280, s: 100, l: 50 },
  { name: "Coral", h: 16, s: 100, l: 66 },
  { name: "Turquoise", h: 174, s: 72, l: 56 },
];

interface AccentColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const AccentColorPicker = ({ isOpen, onClose, onSave }: AccentColorPickerProps) => {
  const { profile, refreshProfile } = useAuth();
  const [hue, setHue] = useState(217);
  const [saturation, setSaturation] = useState(91);
  const [lightness, setLightness] = useState(60);
  const [saving, setSaving] = useState(false);

  // Parse current accent color on open
  useEffect(() => {
    if (isOpen && profile?.accent_color) {
      const parts = profile.accent_color.split(" ");
      if (parts.length === 3) {
        setHue(parseInt(parts[0]) || 217);
        setSaturation(parseInt(parts[1]) || 91);
        setLightness(parseInt(parts[2]) || 60);
      }
    }
  }, [isOpen, profile?.accent_color]);

  const currentColor = `${hue} ${saturation}% ${lightness}%`;
  const cssColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  const selectPreset = (color: typeof PRESET_COLORS[0]) => {
    setHue(color.h);
    setSaturation(color.s);
    setLightness(color.l);
  };

  const saveColor = async () => {
    if (!profile?.id) return;
    
    setSaving(true);
    
    await supabase
      .from("profiles")
      .update({ accent_color: currentColor })
      .eq("id", profile.id);
    
    await refreshProfile();
    setSaving(false);
    toast.success("Accent color updated!");
    onSave?.();
    onClose();
  };

  // Check if accent color is active (has valid expiry)
  const isAccentActive = profile?.accent_expires_at && 
    new Date(profile.accent_expires_at) > new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Choose Accent Color
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Color preview */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl shadow-lg border-2 border-border"
              style={{ backgroundColor: cssColor, boxShadow: `0 10px 30px ${cssColor}40` }}
            />
            <div className="flex-1">
              <p className="font-semibold">Your Accent Color</p>
              <p className="text-sm text-muted-foreground font-mono">{cssColor}</p>
              {isAccentActive && (
                <p className="text-xs text-success mt-1">
                  Active until {new Date(profile!.accent_expires_at!).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Preset colors */}
          <div>
            <Label className="mb-2 block">Preset Colors</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((color) => {
                const colorHsl = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
                const isSelected = hue === color.h && saturation === color.s && lightness === color.l;
                
                return (
                  <motion.button
                    key={color.name}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => selectPreset(color)}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all",
                      isSelected ? "border-white scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: colorHsl }}
                    title={color.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-lg" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Custom color sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Label>Hue</Label>
                <span className="text-sm text-muted-foreground">{hue}°</span>
              </div>
              <div 
                className="h-3 rounded-full mb-2"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, ${saturation}%, ${lightness}%), 
                    hsl(60, ${saturation}%, ${lightness}%), 
                    hsl(120, ${saturation}%, ${lightness}%), 
                    hsl(180, ${saturation}%, ${lightness}%), 
                    hsl(240, ${saturation}%, ${lightness}%), 
                    hsl(300, ${saturation}%, ${lightness}%), 
                    hsl(360, ${saturation}%, ${lightness}%)
                  )`
                }}
              />
              <Slider
                value={[hue]}
                onValueChange={([v]) => setHue(v)}
                max={360}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Saturation</Label>
                <span className="text-sm text-muted-foreground">{saturation}%</span>
              </div>
              <div 
                className="h-3 rounded-full mb-2"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(${hue}, 0%, ${lightness}%), 
                    hsl(${hue}, 100%, ${lightness}%)
                  )`
                }}
              />
              <Slider
                value={[saturation]}
                onValueChange={([v]) => setSaturation(v)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Lightness</Label>
                <span className="text-sm text-muted-foreground">{lightness}%</span>
              </div>
              <div 
                className="h-3 rounded-full mb-2"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(${hue}, ${saturation}%, 0%), 
                    hsl(${hue}, ${saturation}%, 50%), 
                    hsl(${hue}, ${saturation}%, 100%)
                  )`
                }}
              />
              <Slider
                value={[lightness]}
                onValueChange={([v]) => setLightness(v)}
                min={20}
                max={80}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Preview elements */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <p className="text-sm text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg text-white font-medium text-sm"
                style={{ backgroundColor: cssColor }}
              >
                Button
              </button>
              <span 
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${cssColor}20`, color: cssColor }}
              >
                Badge
              </span>
              <div
                className="w-8 h-8 rounded-full"
                style={{ 
                  background: `linear-gradient(135deg, ${cssColor}, hsl(${hue}, ${saturation}%, ${Math.max(20, lightness - 20)}%))`
                }}
              />
            </div>
          </div>

          <Button
            variant="gradient"
            onClick={saveColor}
            disabled={saving || !isAccentActive}
            className="w-full"
          >
            {!isAccentActive ? "Purchase Accent Color First" : saving ? "Saving..." : "Apply Color"}
          </Button>

          {!isAccentActive && (
            <p className="text-xs text-center text-muted-foreground">
              Purchase Accent Color from the shop to customize your profile color
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
