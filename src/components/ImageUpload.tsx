import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  folder: "avatars" | "banners" | "backgrounds" | "quiz-banners";
  className?: string;
  aspectRatio?: "square" | "banner" | "wide";
  showUrlInput?: boolean;
}

export const ImageUpload = ({
  onUpload,
  currentUrl,
  folder,
  className,
  aspectRatio = "square",
  showUrlInput = true,
}: ImageUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!user?.id) {
      toast.error("Please sign in to upload");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-uploads")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("user-uploads")
        .getPublicUrl(fileName);

      onUpload(data.publicUrl);
      toast.success("Image uploaded!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUpload(urlInput.trim());
      setUrlInput("");
      setShowUrl(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Preview */}
      {currentUrl && (
        <div
          className={cn(
            "rounded-xl overflow-hidden border border-border",
            aspectRatio === "square" ? "aspect-square w-24" : 
            aspectRatio === "wide" ? "aspect-[16/9] w-full max-w-md" : "aspect-[3/1] w-full"
          )}
        >
          <img
            src={currentUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Upload buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {uploading ? "Uploading..." : "Upload"}
        </Button>

        {showUrlInput && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrl(!showUrl)}
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* URL Input */}
      {showUrl && showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
