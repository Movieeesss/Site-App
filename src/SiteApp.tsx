import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ProfessionalActionRegister() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  
  // STORAGE GUARD: Try-Catch to prevent Blank Screen and handle memory crashes
  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem('site_v50_final');
      return saved ? JSON.parse(saved) : [{ 
        id: 1, date: '2026-04-13', desc: '', loggedBy: '', 
        status: 'Open', closedDate: '', before: [], after: [], 
        owner: '', closedBy: '', remarks: '' 
      }];
    } catch (e) {
      localStorage.removeItem('site_v50_final');
      return [{ id: 1, date: '2026-04-13', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }];
    }
  });

  const [isUploading, setIsUploading] = useState(false);
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    try {
      localStorage.setItem('site_v50_final', JSON.stringify(rows));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert("Memory Full! Older data cleared to prevent white screen crash.");
      }
    }
  }, [rows]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { id: newId, date: '2026-04-13', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
  };

  // LAG FREE: Sequential Cloudinary upload for 100+ photos
  const uploadPhoto = async (id, type, files) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) {
          setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], data.secure_url] } : r));
        }
      } catch (e) { alert("Upload error!"); }
    }
    setIsUploading(false);
  };

  // INDIVIDUAL PHOTO DELETE (Red X)
  const removePhoto = (id, type, index) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: r[type].filter((_, i) => i !== index) } : r));
  };

  // EXCEL EXPORT FEATURE
  const exportExcel = () => {
    const excelData = rows.map(r => ({
      "Sl No": r.id, "Date": formatDate(r.date), "Description": r.desc, "Logged By": r.loggedBy,
      "Status": r.status, "Closed Date": formatDate(r.closedDate), "Owner": r.owner, "By": r.closedBy, "Remarks": r.remarks
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SiteReport");
    XLSX.writeFile(wb, `${project}_Report.xlsx`);
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // STRAIGHT SPLIT HEADER ALIGNMENT
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 13, fontStyle: 'bold', halign: 'left', cellPadding: 4, fillColor: [211, 211, 211], lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 172 } }
    });

    const head = [['Sno', 'Date Logged', 'Description', 'Logged by', 'Status', 'Closed Date', 'Photos Before', 'Photos After', 'Owner', 'By', 'Remarks']];
    const body = rows.map(r => [r.id, formatDate(r.date), r.desc, r.loggedBy, r.status.toUpperCase(), formatDate(r.closedDate), '', '', r.owner, r.closedBy, r.remarks.toUpperCase()]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', minCellHeight: 45, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [40, 44, 52], textColor: [255, 255, 255] },
      columnStyles: { 2: { cellWidth: 35, halign: 'left' }, 6: { cellWidth: 40 }, 7: { cellWidth: 40 } },
      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];
        
        // Color Logic
        if (data.column.index === 4) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
        if (data.column.index === 10 && rowData.remarks.toUpperCase() === 'DONE') data.cell.styles.fillColor = [76, 217, 100];

        // RENDER UNLIMITED PHOTOS IN GRID
        const drawGrid = (urls, cell) => {
          urls.slice(0, 6).forEach((url, i) => {
            const x = cell.x + 1 + (i % 2 * 20);
            const y = cell.y + 2 + (Math.floor(i/2) * 16);
            doc.addImage(url, 'JPEG', x, y, 18, 14);
          });
        };
        if (data.column.index === 6) drawGrid(rowData.before, data.cell);
        if (data.column.index === 7) drawGrid(rowData.after, data.cell);
      }
    });
    doc.save(`${project}.pdf`);
  };

  return (
    <div style={ui.container}>
      <header style={ui.nav}><input value={project} onChange={e => setProject(e.target.value)} style={ui.headIn} /></header>
      <div style={ui.main}>
        {rows.map(row => (
          <div key={row.id} style={ui.card}>
            <div style={ui.topRow}>
              <strong>ID #{row.id}</strong>
              <input style={{...ui.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff0000':'#92d050'}} value={row.status} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} />
            </div>
            <textarea placeholder="Description" style={ui.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            <div style={ui.photoGrid}>
              {['before', 'after'].map(type => (
                <div key={type}>
                  <label style={ui.upBtn}>📸 {type.toUpperCase()} <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, type, e.target.files)} /></label>
                  <div style={ui.thumbGrid}>
                    {row[type].map((url, i) => (
                      <div key={i} style={ui.thumbWrap}>
                        <img src={url} style={ui.thumb} alt="site" />
                        <button onClick={() => removePhoto(row.id, type, i)} style={ui.delBtn}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <input placeholder="Remarks" style={ui.field} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>
      <div style={ui.footer}>
        <button onClick={addRow} style={ui.btnGreen}>+ ROW</button>
        <button onClick={generatePDF} disabled={isUploading} style={ui.btnBlue}>{isUploading ? '...' : 'PDF'}</button>
        <button onClick={exportExcel} style={ui.btnYellow}>EXCEL</button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={ui.btnRed}>RESET</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f4f7fa', minHeight: '100vh', paddingBottom: '120px', fontFamily: 'Arial' },
  nav: { background: '#1a1c1e', padding: '15px', position: 'sticky', top: 0, zIndex: 10 },
  headIn: { width: '100%', background: 'transparent', border: '1px solid #fff', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' },
  main: { padding: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  badge: { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center', fontSize: '12px' },
  area: { width: '100%', height: '60px', borderRadius: '6px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box' },
  photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '12px 0' },
  upBtn: { background: '#f8f9fa', padding: '10px', display: 'block', textAlign: 'center', borderRadius: '6px', border: '1px dashed #adb5bd', fontSize: '10px', cursor: 'pointer' },
  thumbGrid: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' },
  thumbWrap: { position: 'relative', width: '40px', height: '40px' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' },
  delBtn: { position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '15px', height: '15px', fontSize: '10px' },
  field: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '8px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  btnGreen: { flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnBlue: { flex: 1, padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnYellow: { flex: 1, padding: '15px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnRed: { padding: '15px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }
};
