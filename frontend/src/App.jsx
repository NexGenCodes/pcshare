import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, File, Loader2, CheckCircle2, XCircle, QrCode, Smartphone } from 'lucide-react';

function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setStatus(null);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.setRequestHeader('x-filename', file.name);
    xhr.setRequestHeader('x-filesize', file.size.toString());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        setStatus({ type: 'success', message: `Successfully transferred ${file.name}` });
        fetchFiles();
      } else {
        setStatus({ type: 'error', message: 'Transfer failed. Connection interrupted.' });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setStatus({ type: 'error', message: 'Network error. Check local connection.' });
    };

    xhr.send(file);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', color: '#f3f4f6' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '10px' }}>
          <h1 style={{ fontSize: '2.5rem', margin: 0, color: '#60a5fa', fontWeight: '800' }}>TURBO TRANSFER</h1>
          <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>PC-TO-MOBILE</span>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Zero-copy, high-speed local streaming</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? '1fr 300px' : '1fr', gap: '30px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#111827', padding: '40px', borderRadius: '16px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{ 
              width: '100%', 
              height: '200px', 
              border: '2px dashed #4b5563', 
              borderRadius: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: uploading ? 'default' : 'pointer',
              transition: 'all 0.2s',
              backgroundColor: uploading ? '#0f172a' : 'transparent'
            }}
          >
            {uploading ? (
              <div style={{ textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: '#3b82f6', marginBottom: '15px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{progress}%</div>
                <div style={{ color: '#9ca3af' }}>Streaming directly to disk...</div>
              </div>
            ) : (
              <>
                <Upload size={48} style={{ color: '#4b5563', marginBottom: '15px' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Drop file or click to upload</div>
                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>FastTransfer Zero-Copy Engine</div>
              </>
            )}
          </div>
          
          {status && (
            <div style={{ marginTop: '20px', padding: '12px 20px', borderRadius: '8px', backgroundColor: status.type === 'success' ? '#064e3b' : '#7f1d1d', color: status.type === 'success' ? '#6ee7b7' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              {status.message}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#111827', padding: '30px', borderRadius: '16px', border: '1px solid #374151', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', color: '#93c5fd' }}>
            <Smartphone size={20} />
            <h3 style={{ margin: 0 }}>Mobile Handshake</h3>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', display: 'inline-block', marginBottom: '15px' }}>
            <img src="/api/qr" alt="QR Link" style={{ width: '180px', height: '180px', display: 'block' }} />
          </div>
          
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Scan to open dashboard on your phone instantly via <code style={{ color: '#60a5fa' }}>transfer.local</code></p>
        </div>
      </div>

      <div style={{ backgroundColor: '#111827', borderRadius: '16px', border: '1px solid #374151', overflow: 'hidden' }}>
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '600' }}>Active Files</h2>
          <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{files.length} items available</div>
        </div>
        <div style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {files.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <File size={48} />
              <div>No files transferred yet</div>
            </div>
          ) : (
            files.map((file) => (
              <div key={file.name} style={{ padding: '16px 25px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ backgroundColor: '#1e3a8a', padding: '10px', borderRadius: '8px', color: '#60a5fa' }}><File size={24} /></div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#f3f4f6' }}>{file.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{formatSize(file.size)} • {new Date(file.modified * 1000).toLocaleTimeString()}</div>
                  </div>
                </div>
                <a
                  href={`/api/download/${encodeURIComponent(file.name)}`}
                  download
                  style={{ 
                    backgroundColor: '#1f2937', 
                    color: '#60a5fa', 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    textDecoration: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    border: '1px solid #374151'
                  }}
                >
                  <Download size={16} /> Get File
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
        Powered by FastAPI Streaming & Zeroconf • transfer.local
      </footer>
    </div>
  );
}

export default App;
