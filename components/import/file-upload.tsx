"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fadeIn } from "@/lib/animations";

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileClear?: () => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onFileClear,
  accept = ".csv",
  disabled = false,
  className,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  const validateFile = (file: File): boolean => {
    const validTypes = [".csv", "text/csv", "application/csv"];
    const isValidType =
      file.name.toLowerCase().endsWith(".csv") ||
      validTypes.includes(file.type);

    if (!isValidType) {
      setError("Please select a CSV file");
      return false;
    }

    setError(null);
    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileClear?.();
  };

  return (
    <motion.div
      className={cn("w-full", className)}
      {...(reducedMotion ? {} : fadeIn)}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
              isDragOver
                ? "border-accent bg-accent/5"
                : "border-border hover:border-muted-foreground/50",
              disabled && "cursor-not-allowed opacity-50",
              error && "border-destructive"
            )}
          >
            <motion.div
              animate={
                isDragOver && !reducedMotion
                  ? { scale: [1, 1.1, 1] }
                  : { scale: 1 }
              }
              transition={
                isDragOver
                  ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
            >
              <Upload
                className={cn(
                  "h-10 w-10 transition-colors",
                  isDragOver ? "text-accent" : "text-muted-foreground"
                )}
              />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drag and drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="selected"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <motion.div
              initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <FileText className="h-8 w-8 text-accent shrink-0" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={disabled}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </motion.div>
  );
}
