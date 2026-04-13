import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActionRegisterProfessional() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v11_pro');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '13-04-2026', desc: '', status: 'Open', before: [], after: [], remarks: '' }];
  });

  const [isUploading, setIsUploading] = useState(false);

  // Cloudinary Config - Highly Optimized [cite: 275, 296]
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    localStorage.setItem('site_v11_pro', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { id: newId, date: '13-04-2026', desc: '', status: 'Open', before: [], after: [], remarks: '' }]);
  };

  const clearAll = () => {
    if (window.confirm("Kandippa ella data-vum clear pannanuma?")) {
      setRows([{ id: 1, date: '13-04-2026', desc: '', status: 'Open', before: [], after: [], remarks: '' }]);
      localStorage.removeItem('site_v11_pro');
    }
  };

  // Optimized Upload: Prevents browser lag during heavy uploads
  const uploadPhoto = async (id, type, files) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    
    // 100+ photos handle panna sequential upload with promise
    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { 
          method: "POST", 
          body: formData 
        });
        const data = await res.json();
        
        // URL-ah mattum store panradhala memory crash aagadhu
        setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], data.secure_url] } : r));
      } catch (e) { 
        console.error("Upload failed for:", file.name);
      }
    }
    setIsUploading(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Main Header - Bold & Professional 
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 44, 52);
    doc.text(project.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text("ACTION REGISTER - SITE PROGRESS REPORT", pageWidth / 2, 22, { align: 'center' });

    // Table Headers [cite: 32, 51]
    const head = [['S.No', 'Date Logged', 'Description', 'Current Status', 'P1(Before)', 'P2(Before)', 'P1(After)', 'P2(After)', 'Remarks']];
    
    const body = rows.map(r => [
      r.id, r.date, r.desc, r.status.toUpperCase(), '', '', '', '', r.remarks.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 30,
      head: head,
      body: body,
      theme: 'grid',
      styles: { 
        fontSize: 9, 
        font: "helvetica",
        halign: 'center', 
        valign: 'middle', 
        minCellHeight: 35, 
        lineWidth: 0.2, 
        lineColor: [0, 0, 0] 
      },
      headStyles: { 
        fillColor: [40, 44, 52], 
        textColor: [255, 255, 255], 
        fontSize: 10, 
        fontStyle: 'bold' 
      },
      columnStyles: { 
        2: { cellWidth: 45, halign: 'left' },
        4: { cellWidth: 28 }, 5: { cellWidth: 28 }, 
        6: { cellWidth: 28 }, 7: { cellWidth: 28 } 
      },

      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // Status Colors [cite: 51, 113]
        if (data.column.index === 3) {
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 59, 48]; // Red
          if (s === 'DONE') data.cell.styles.fillColor = [76, 217, 100]; // Green
        }

        // Remarks Colors [cite: 54, 113]
        if (data.column.index === 8) {
          const rem = rowData.remarks.toUpperCase();
          if (rem === 'DONE') data.cell.styles.fillColor = [76, 217, 100];
          if (rem.includes('UNABLE') || rem.includes('PENDING')) data.cell.styles.fillColor = [255, 204, 0];
        }

        // Photo Column Mapping
        const drawImg = (url, cell) => {
          if (url) doc.addImage(url, 'JPEG', cell.x + 1.5, cell.y + 1.5, cell.width - 3, cell.height - 3);
        };

        if (data.column.index === 4) drawImg(rowData.before[0], data.cell);
        if (data.column.index === 5) drawImg(rowData.before[1], data.cell);
        if (data.column.index === 6) drawImg(rowData.after[0], data.cell);
        if (data.column.index === 7) drawImg(rowData.after[1], data.cell);
      }
    });

    doc.save(`${project}_Report.pdf`);
  };

  return (
    <div style={appUI.container}>
      <header style={appUI.nav}><input value={project} onChange={e => setProject(e.target.value)} style={appUI.titleInput} /></header>
      
      <div style={appUI.main}>
        {rows.map(row => (
          <div key={row.id} style={appUI.card}>
            <div style={appUI.cardHeader}>
              <span style={appUI.idTag}>ITEM #{row.id}</span>
              <input 
                style={{...appUI.statusBox, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff3b30':'#4cd964'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} 
              />
            </div>
            
            <textarea placeholder="Site Issue Description..." style={appUI.textArea} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            
            <div style={appUI.photoSection}>
              <label style={appUI.uploadBtn}>📷 BEFORE ({row.before.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
              <label style={appUI.uploadBtn}>📸 AFTER ({row.after.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
            </div>
            
            <input placeholder="Remarks (DONE, PENDING, etc.)" style={appUI.remarksIn} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>

      <div style={appUI.actionArea}>
        <button onClick={addRow} style={appUI.btnPrimary}>+ NEW ITEM</button>
        <button onClick={generatePDF} disabled={isUploading} style={appUI.btnSecondary}>{isUploading ? 'SYNCING...' : 'EXPORT PDF'}</button>
        <button onClick={clearAll} style={appUI.btnDanger}>RESET</button>
      </div>
    </div>
  );
}

const appUI = {
  container: { background: '#f0f2f5', minHeight: '100vh', paddingBottom: '120px', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  nav: { background: '#2c3e50', padding: '20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
  titleInput: { width: '100%', background: 'transparent', border: '2px solid #fff', borderRadius: '5px', color: '#fff', textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '5px' },
  main: { padding: '15px', maxWidth: '800px', margin: '0 auto' },
  card: { background: '#fff', borderRadius: '15px', padding: '20px', marginBottom: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.08)', border: '1px solid #e1e4e8' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  idTag: { fontWeight: 'bold', fontSize: '16px', color: '#1a1a1a' },
  statusBox: { border: 'none', borderRadius: '8px', color: '#fff', padding: '8px 15px', width: '100px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' },
  textArea: { width: '100%', height: '70px', borderRadius: '10px', border: '1px solid #ced4da', padding: '12px', fontSize: '15px', boxSizing: 'border-box', resize: 'none' },
  photoSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '20px 0' },
  uploadBtn: { background: '#f8f9fa', padding: '15px', textAlign: 'center', borderRadius: '10px', border: '2px dashed #007bff', color: '#007bff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  remarksIn: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ced4da', boxSizing: 'border-box', fontSize: '14px' },
  actionArea: { position: 'fixed', bottom: 0, width: '100%', background: 'rgba(255,255,255,0.95)', padding: '20px', display: 'flex', gap: '15px', boxShadow: '0 -5px 20px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  btnPrimary: { flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' },
  btnSecondary: { flex: 1, padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px' },
  btnDanger: { padding: '15px 25px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' }
};
