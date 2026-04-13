import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SiteReport() {
  const [project, setProject] = useState(localStorage.getItem('project') || '');
  const [place, setPlace] = useState(localStorage.getItem('place') || '');
  const [date, setDate] = useState(localStorage.getItem('date') || '');
  const [description, setDescription] = useState(localStorage.getItem('description') || '');
  const [images, setImages] = useState<{ file: File; preview: string; id: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync basic info to localStorage
  useEffect(() => {
    localStorage.setItem('project', project);
    localStorage.setItem('place', place);
    localStorage.setItem('date', date);
    localStorage.setItem('description', description);
  }, [project, place, date, description]);

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newImages = filesArray.map(file => ({
        file: file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9) // Unique ID for faster list updates
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  // Remove Image with Memory Cleanup
  const removeImage = useCallback((id: string, preview: string) => {
    URL.revokeObjectURL(preview); // Frees up browser memory immediately
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const clearForm = () => {
    if (window.confirm("Clear all data?")) {
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setProject('');
      setPlace('');
      setDate('');
      setDescription('');
      setImages([]);
      localStorage.clear();
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generatePDFBlob = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // FORMAT DATE: From 2026-04-13 to 13-04-2026
    const formattedDate = date ? date.split('-').reverse().join('-') : '';

    doc.setFillColor(146, 208, 80); 
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("SITE PROGRESS REPORT", pageWidth / 2, 17, { align: 'center' });

    autoTable(doc, {
      startY: 30,
      head: [['Field', 'Details']],
      body: [
        ['Project Name', project.toUpperCase()],
        ['Location', place.toUpperCase()],
        ['Work Date', formattedDate], // Use the reverse formatted date here
        ['Description', description],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 112, 192], fontSize: 12 },
      styles: { cellPadding: 5, fontSize: 11 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    for (let i = 0; i < images.length; i++) {
      const base64 = await fileToBase64(images[i].file);
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Progress Photo ${i + 1}:`, 15, currentY);
      
      const imgProps = doc.getImageProperties(base64);
      const imgWidth = 170; 
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      doc.addImage(base64, 'JPEG', 20, currentY + 5, imgWidth, imgHeight);
      currentY += imgHeight + 25;
    }

    const totalPages = doc.getNumberOfPages();
    for (let j = 1; j <= totalPages; j++) {
      doc.setPage(j);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${j} of ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
    }

    return doc.output('blob');
  };

  const handleAction = async (type: 'download' | 'share') => {
    if (!project || images.length === 0) return alert("Add details and photos!");
    setLoading(true);
    try {
      const blob = await generatePDFBlob();
      const file = new File([blob], `${project.replace(/\s+/g, '_')}_Report.pdf`, { type: 'application/pdf' });

      if (type === 'download') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
      } else {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Site Report' });
        } else {
          alert("Sharing not supported. Please download instead.");
        }
      }
    } catch (err) {
      alert("Error generating report.");
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>SITE REPORT BUILDER</header>
      
      <div style={formCardStyle}>
        <div style={inputGroup}><label style={labelStyle}>Project Name</label><input value={project} style={inputStyle} onChange={(e) => setProject(e.target.value)} /></div>
        <div style={inputGroup}><label style={labelStyle}>Location</label><input value={place} style={inputStyle} onChange={(e) => setPlace(e.target.value)} /></div>
        <div style={inputGroup}><label style={labelStyle}>Date of Work</label><input type="date" value={date} style={inputStyle} onChange={(e) => setDate(e.target.value)} /></div>
        <div style={inputGroup}><label style={labelStyle}>Progress Notes</label><textarea value={description} style={textareaStyle} onChange={(e) => setDescription(e.target.value)} /></div>
        
        <label style={uploadBoxStyle}>📷 ADD SITE PHOTOS<input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} /></label>

        {images.length > 0 && (
          <div style={previewGrid}>
            {images.map((img) => (
              <div key={img.id} style={thumbWrapper}>
                <img src={img.preview} style={thumbnailStyle} alt="preview" />
                <button onClick={() => removeImage(img.id, img.preview)} style={removeBtn}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={actionArea}>
          <button onClick={() => handleAction('download')} disabled={loading} style={btnDownload}>{loading ? "PROCESSING..." : "DOWNLOAD PDF"}</button>
          <button onClick={() => handleAction('share')} disabled={loading} style={btnShare}>{loading ? "PREPARING..." : "SHARE TO WHATSAPP"}</button>
          <button onClick={clearForm} style={btnClear}>RESET / CLEAR ALL</button>
        </div>
      </div>
    </div>
  );
}

// Styles
const containerStyle = { maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif' };
const headerStyle = { backgroundColor: '#92d050', padding: '20px', textAlign: 'center' as 'center', fontWeight: 'bold', fontSize: '20px', color: '#fff' };
const formCardStyle = { padding: '20px', display: 'flex', flexDirection: 'column' as 'column', gap: '15px' };
const inputGroup = { display: 'flex', flexDirection: 'column' as 'column', gap: '5px' };
const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#444' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ced4da' };
const textareaStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ced4da', height: '80px', resize: 'none' as 'none' };
const uploadBoxStyle = { padding: '20px', backgroundColor: '#fff', color: '#0070c0', textAlign: 'center' as 'center', borderRadius: '10px', border: '2px dashed #0070c0', cursor: 'pointer', fontWeight: 'bold' };
const previewGrid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' };
const thumbWrapper = { position: 'relative' as 'relative' };
const thumbnailStyle = { width: '100%', height: '60px', objectFit: 'cover' as 'cover', borderRadius: '6px', border: '1px solid #ddd' };
const removeBtn = { position: 'absolute' as 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontWeight: 'bold' };
const actionArea = { marginTop: '10px', display: 'flex', flexDirection: 'column' as 'column', gap: '12px' };
const btnDownload = { padding: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px' };
const btnShare = { padding: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px' };
const btnClear = { background: 'none', border: 'none', color: '#6c757d', textDecoration: 'underline', cursor: 'pointer', fontSize: '14px' };
