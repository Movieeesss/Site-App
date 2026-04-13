import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CloudinaryActionRegister() {
  const [projectTitle, setProjectTitle] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_data_cloudinary');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '7-May-25', desc: '', status: 'Open', before: [], after: [], remarks: '' }];
  });

  const [isUploading, setIsUploading] = useState(false);

  // Cloudinary Config (Unga details inge irukku)
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    localStorage.setItem('site_data_cloudinary', JSON.stringify(rows));
  }, [rows]);

  // Cloudinary Upload Logic - Memory safe
  const uploadToCloudinary = async (id, type, files) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    
    for (let file of fileArray) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData
        });
        const data = await response.json();
        
        // URL-ah mattum save pannuvom, so Lag varaadhu
        setRows(prev => prev.map(r => 
          r.id === id ? { ...r, [type]: [...r[type], data.secure_url] } : r
        ));
      } catch (err) {
        alert("Upload failed! Check internet or Preset settings.");
      }
    }
    setIsUploading(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header Table - Sharook 1 Look
    autoTable(doc, {
      body: [[projectTitle.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 11, fontStyle: 'bold', halign: 'center', fillColor: [211, 211, 211], lineWidth: 0.5 },
      columnStyles: { 0: { cellWidth: 138 }, 1: { cellWidth: 138 } }
    });

    const bodyData = rows.map(r => [r.id, r.date, r.desc, r.status, '', '', r.remarks]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 1,
      head: [['Slno', 'Date', 'Description', 'Status', 'Photos Before', 'Photos After', 'Remarks']],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: 8, halign: 'center', valign: 'middle', minCellHeight: 45, lineWidth: 0.1 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
      
      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // Color Logic
        if (data.column.index === 3) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }

        // Photo Rendering with "Photo 1, 2..." labels
        const drawPhotos = (urls, cell) => {
          urls.slice(0, 4).forEach((url, i) => {
            const yOffset = cell.y + 4 + (i * 10);
            doc.setFontSize(5);
            doc.text(`Photo ${i + 1}`, cell.x + 2, yOffset);
            doc.addImage(url, 'JPEG', cell.x + 1, yOffset + 1, 38, 8); 
          });
        };

        if (data.column.index === 4) drawPhotos(rowData.before, data.cell);
        if (data.column.index === 5) drawPhotos(rowData.after, data.cell);
      }
    });

    doc.save(`${projectTitle}.pdf`);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={styles.titleInput} />
      </header>

      <div style={styles.list}>
        {rows.map(row => (
          <div key={row.id} style={styles.card}>
            <div style={styles.cardTop}>
              <strong>Item #{row.id}</strong>
              <input 
                style={{...styles.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff4d4d':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} 
              />
            </div>
            <textarea placeholder="Description" style={styles.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            
            <div style={styles.btnGrid}>
              <label style={styles.upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => uploadToCloudinary(row.id, 'before', e.target.files)} /></label>
              <label style={styles.upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => uploadToCloudinary(row.id, 'after', e.target.files)} /></label>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <button onClick={() => setRows([...rows, { id: rows.length+1, date: '7-May-25', desc: '', status: 'Open', before: [], after: [], remarks: '' }])} style={styles.addBtn}>+ ROW</button>
        <button onClick={generatePDF} disabled={isUploading} style={styles.pdfBtn}>{isUploading ? 'Uploading...' : 'GET PDF'}</button>
      </div>
    </div>
  );
}

const styles = {
  container: { background: '#f4f4f4', minHeight: '100vh', paddingBottom: '90px' },
  header: { background: '#212529', padding: '15px', position: 'sticky', top: 0, zIndex: 10 },
  titleInput: { width: '100%', background: 'transparent', border: '1px solid #fff', color: '#fff', textAlign: 'center', fontSize: '18px' },
  list: { padding: '12px' },
  card: { background: '#fff', borderRadius: '8px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  badge: { border: 'none', borderRadius: '4px', color: '#fff', padding: '4px', width: '70px', textAlign: 'center', fontSize: '11px' },
  area: { width: '100%', height: '50px', border: '1px solid #ddd', borderRadius: '5px', padding: '8px' },
  btnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' },
  upBtn: { background: '#e9ecef', padding: '10px', textAlign: 'center', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '8px' },
  addBtn: { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px' },
  pdfBtn: { flex: 1, padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }
};
