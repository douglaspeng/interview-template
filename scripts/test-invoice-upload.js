import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadInvoice(filePath) {
  try {
    console.log('Reading file:', filePath);
    const fileStream = fs.createReadStream(filePath);
    const formData = new FormData();
    formData.append('file', fileStream);

    console.log('Sending request to upload endpoint...');
    const response = await fetch('http://localhost:3000/api/invoices/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Server error response:', text);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log('Upload response:', result);

    // If successful, fetch the processed invoice details
    if (result.invoiceId) {
      console.log('Fetching processed invoice details...');
      const invoiceResponse = await fetch(`http://localhost:3000/api/invoices/${result.invoiceId}`);
      if (!invoiceResponse.ok) {
        const text = await invoiceResponse.text();
        console.error('Error fetching invoice details:', text);
        throw new Error(`Failed to fetch invoice details: ${invoiceResponse.status}`);
      }
      const invoiceDetails = await invoiceResponse.json();
      console.log('Processed invoice details:', invoiceDetails);
    }

    return result;
  } catch (error) {
    console.error('Error in uploadInvoice:', error);
    throw error;
  }
}

async function main() {
  try {
    const sampleDir = path.join(__dirname, '..', 'sample-data');
    const targetFile = '7072948.pdf';
    const filePath = path.join(sampleDir, targetFile);

    console.log('Testing invoice processing with file:', targetFile);
    console.log('Full path:', filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    await uploadInvoice(filePath);
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main(); 