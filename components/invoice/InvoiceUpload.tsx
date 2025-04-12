'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function InvoiceUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please upload a PDF or image file');
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // If it's a duplicate error, show a message with options
        if (response.status === 409 && errorData.error === 'Duplicate invoice detected') {
          toast.error(
            <div>
              <p>Duplicate invoice detected!</p>
              <p>Invoice ID: {errorData.duplicateId}</p>
              <p>Would you like to save it anyway?</p>
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  onClick={() => handleForceSave(file, errorData.duplicateId)}
                >
                  Yes, save anyway
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setFile(null)}
                >
                  No, cancel
                </Button>
              </div>
            </div>,
            { duration: 10000 }
          );
          return;
        }
        
        throw new Error(errorData.details || 'Upload failed');
      }
      
      const data = await response.json();
      toast.success('Invoice uploaded successfully');
      setFile(null);
      
      // Refresh the page to show the new invoice
      router.refresh();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload invoice');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleForceSave = async (file: File, duplicateId: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('forceSave', 'true');
      
      const response = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Upload failed');
      }
      
      const data = await response.json();
      toast.success('Invoice uploaded successfully');
      setFile(null);
      
      // Refresh the page to show the new invoice
      router.refresh();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload invoice');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Upload Invoice</h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
          >
            {isUploading ? 'Processing...' : 'Upload & Process'}
          </Button>
        </div>
      </div>
    </Card>
  );
} 