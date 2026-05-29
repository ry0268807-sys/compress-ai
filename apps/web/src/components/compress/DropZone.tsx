'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, Image, Archive } from 'lucide-react';
import clsx from 'clsx';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  maxSizeLabel?: string;
}

export function DropZone({ onFiles, disabled, maxSizeLabel = '10GB+' }: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) onFiles(accepted);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'glass-hover cursor-pointer p-12 text-center border-2 border-dashed transition-all duration-300',
        isDragActive ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' : 'border-white/10',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
          <Upload className="w-8 h-8 text-indigo-400" />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {isDragActive ? 'Drop files here' : 'Drag & drop your files'}
      </h3>
      <p className="text-gray-400 mb-4">or click to browse • Supports up to {maxSizeLabel}</p>
      <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Film className="w-4 h-4" /> MP4, MOV, MKV, AVI, WEBM
        </span>
        <span className="flex items-center gap-1">
          <Image className="w-4 h-4" /> JPG, PNG, WEBP, HEIC
        </span>
        <span className="flex items-center gap-1">
          <Archive className="w-4 h-4" /> ZIP, 7Z, TAR
        </span>
      </div>
    </div>
  );
}
