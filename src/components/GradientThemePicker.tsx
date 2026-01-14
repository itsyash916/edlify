import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Check, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PRESET_GRADIENTS = [
  { name: "Ocean", color1: "200 80% 50%", color2: "220 90% 40%" },
  { name: "Sunset", color1: "20 90% 55%", color2: "340 80% 50%" },
  { name: "Forest", color1: "140 70% 40%", color2: "160 80% 30%" },
  { name: "Lavender", color1: "280 70% 60%", color2: "320 80% 50%" },
  { name: "Fire", color1: "15 90% 55%", color2: "45 95% 50%" },
  { name: "Mint", color1: "160 60% 50%", color2: "180 70% 40%" },
  { name: "Berry", color1: "300 70% 50%", color2: "330 80% 45%" },
  { name: "Neon", color1: "180 100% 50%", color2: "280 100% 60%" },
];

interface GradientThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const GradientThemePicker = ({ isOpen, onClose, onSave }: GradientThemePickerProps) => {
  const { profile, refreshProfile } = useAuth();
  
  // Check if theme is active (purchased or won)
  const isThemeActive = profile?.accent_expires_at && new Date(profile.accent_expires_at) > new Date();
  
  // Color 1 state
  const [hue1, setHue1] = useState(217);
  const [sat1, setSat1] = useState(91);
  const [light1, setLight1] = useState(60);
  
  // Color 2 state
  const [hue2, setHue2] = useState(262);
  const [sat2, setSat2] = useState(83);
  const [light2, setLight2] = useState(58);
  
  const [activeColor, setActiveColor] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  // Parse existing gradient on open
  useEffect(() => {
    if (isOpen && profile?.accent_color) {
      const parts = profile.accent_color.split("|");
      if (parts.length === 2) {
        const [c1, c2] = parts;
        const parseColor = (c: string) => {
          const match = c.match(/(\d+)\s+(\d+)%?\s+(\d+)%?/);
          if (match) {
            return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
          }
          return null;
        };
        const parsed1 = parseColor(c1);
        const parsed2 = parseColor(c2);
        if (parsed1) {
          setHue1(parsed1.h);
          setSat1(parsed1.s);
          setLight1(parsed1.l);
        }
        if (parsed2) {
          setHue2(parsed2.h);
          setSat2(parsed2.s);
          setLight2(parsed2.l);
        }
      }
    }
  }, [isOpen, profile?.accent_color]);

  const color1 = `${hue1} ${sat1}% ${light1}%`;
  const color2 = `${hue2} ${sat2}% ${light2}%`;
  const gradientValue = `${color1}|${color2}`;
  
  const gradientStyle = {
    background: `linear-gradient(135deg, hsl(${color1}), hsl(${color2}))`
  };

  const selectPreset = (preset: typeof PRESET_GRADIENTS[0]) => {
    const parsePreset = (c: string) => {
      const [h, s, l] = c.split(" ").map((v) => parseInt(v));
      return { h, s: parseInt(s.toString()), l: parseInt(l.toString()) };
    };
    const c1 = parsePreset(preset.color1);
    const c2 = parsePreset(preset.color2);
    setHue1(c1.h);
    setSat1(c1.s);
    setLight1(c1.l);
    setHue2(c2.h);
    setSat2(c2.s);
    setLight2(c2.l);
  };

  const applyTheme = () => {
    if (!isThemeActive) return;
    
    // Apply CSS variables
    document.documentElement.style.setProperty('--primary', color1);
    document.documentElement.style.setProperty('--primary-glow', `${hue1} ${sat1}% ${light1 + 10}%`);
    document.documentElement.style.setProperty('--secondary', color2);
    document.documentElement.style.setProperty('--secondary-glow', `${hue2} ${sat2}% ${light2 + 10}%`);
    document.documentElement.style.setProperty('--ring', color1);
  };

  // Apply theme when colors change (live preview)
  useEffect(() => {
    if (isOpen && isThemeActive) {
      applyTheme();
    }
  }, [hue1, sat1, light1, hue2, sat2, light2, isOpen, isThemeActive]);

  const saveGradient = async () => {
    if (!profile || !isThemeActive) return;
    
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({ accent_color: gradientValue })
      .eq("id", profile.id);

    if (!error) {
      applyTheme();
      await refreshProfile();
      toast.success("Theme applied!");
      onSave?.();
      onClose();
    } else {
      toast.error("Failed to save theme");
    }
    
    setSaving(false);
  };

  const currentHue = activeColor === 1 ? hue1 : hue2;
  const currentSat = activeColor === 1 ? sat1 : sat2;
  const currentLight = activeColor === 1 ? light1 : light2;
  const setHue = activeColor === 1 ? setHue1 : setHue2;
  const setSat = activeColor === 1 ? setSat1 : setSat2;
  const setLight = activeColor === 1 ? setLight1 : setLight2;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Theme Customizer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div 
            className="h-24 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
            style={gradientStyle}
          >
            Your Theme
          </div>

          {/* Presets */}
          <div>
            <p className="text-sm font-medium mb-2">Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_GRADIENTS.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selectPreset(preset)}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                  style={{
                    background: `linear-gradient(135deg, hsl(${preset.color1}), hsl(${preset.color2}))`
                  }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Color Tabs */}
          <Tabs value={activeColor.toString()} onValueChange={(v) => setActiveColor(parseInt(v) as 1 | 2)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="1" className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${color1})` }} />
                Color 1
              </TabsTrigger>
              <TabsTrigger value="2" className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${color2})` }} />
                Color 2
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeColor.toString()} className="space-y-4 mt-4">
              {/* Hue */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">Hue</label>
                  <span className="text-sm text-muted-foreground">{currentHue}°</span>
                </div>
                <div 
                  className="h-3 rounded-full mb-2"
                  style={{
                    background: "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))"
                  }}
                />
                <Slider
                  value={[currentHue]}
                  onValueChange={([v]) => setHue(v)}
                  max={360}
                  step={1}
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">Saturation</label>
                  <span className="text-sm text-muted-foreground">{currentSat}%</span>
                </div>
                <div 
                  className="h-3 rounded-full mb-2"
                  style={{
                    background: `linear-gradient(to right, hsl(${currentHue} 0% ${currentLight}%), hsl(${currentHue} 100% ${currentLight}%))`
                  }}
                />
                <Slider
                  value={[currentSat]}
                  onValueChange={([v]) => setSat(v)}
                  max={100}
                  step={1}
                />
              </div>

              {/* Lightness */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium">Lightness</label>
                  <span className="text-sm text-muted-foreground">{currentLight}%</span>
                </div>
                <div 
                  className="h-3 rounded-full mb-2"
                  style={{
                    background: `linear-gradient(to right, hsl(${currentHue} ${currentSat}% 0%), hsl(${currentHue} ${currentSat}% 50%), hsl(${currentHue} ${currentSat}% 100%))`
                  }}
                />
                <Slider
                  value={[currentLight]}
                  onValueChange={([v]) => setLight(v)}
                  min={20}
                  max={80}
                  step={1}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* UI Preview */}
          <div className="p-4 rounded-xl bg-muted/50 space-y-3">
            <p className="text-sm font-medium">Preview</p>
            <div className="flex gap-2">
              <Button size="sm" style={gradientStyle} className="text-white border-0">
                Primary
              </Button>
              <Button size="sm" variant="outline" style={{ borderColor: `hsl(${color1})`, color: `hsl(${color1})` }}>
                Outline
              </Button>
            </div>
          </div>

          {/* Save Button */}
          {isThemeActive ? (
            <Button
              variant="gradient"
              className="w-full"
              onClick={saveGradient}
              disabled={saving}
            >
              {saving ? "Saving..." : "Apply Theme"}
            </Button>
          ) : (
            <div className="text-center p-4 rounded-xl bg-muted/50">
              <Lock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Purchase Theme Color from the shop or win it from Lucky Spin to unlock customization!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
