import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActionRegisterFinalMobile() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v20_mobile');
    // Default date set to 13-04-2026 as per your request
    return saved ? JSON.parse(saved) : [{ 
      id: 1, date: '2026-04-13', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }];
  });

  const [isUploading, setIsUploading] = useState(false);
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    localStorage.setItem('site_v20_mobile', JSON.stringify(rows));
  }, [rows]);

  // Converts 2026-04-13 to 13-04-2026 for PDF
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { 
      id: newId, date: '2026-04-13', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }]);
  };

  // LAG PERMANENT FIX: Upload direct to Cloudinary & store URL only
  const uploadPhoto = async (id, type, files) => {
    setIsUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], data.secure_url] } : r));
      } catch (e) { alert("Upload error!"); }
    }
    setIsUploading(false);
  };

  // INDIVIDUAL IMAGE DELETE OPTION
  const removePhoto = (id, type, index) => {
    setRows(prev => prev.map(r => r.id === id ? { 
      ...r, [type]: r[type].filter((_, i) => i !== index) 
    } : r));
  };

  const clearAll = () => {
    if (window.confirm("Kandippa ella data-vum clear pannanuma?")) {
      setRows([{ id: 1, date: '2026-04-13', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
      localStorage.removeItem('site_v20_mobile');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // 1. STRAIGHT SPLIT HEADER (image_0d0324.png style)
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 13, fontStyle: 'bold', halign: 'left', cellPadding: 4, fillColor: [211, 211, 211], lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: { 
        0: { cellWidth: 105 }, // Left Side Alignment Fixed
        1: { cellWidth: 172, halign: 'left' } // Right Side Alignment Fixed
      }
    });

    const head = [['Slno', 'Date Logged', 'Description', 'Logged by', 'Status', 'Closed Date', 'P1(B)', 'P2(B)', 'P1(A)', 'P2(A)', 'Owner', 'By', 'Remarks']];

    const body = rows.map(r => [
      r.id, formatDate(r.date), r.desc, r.loggedBy, r.status.toUpperCase(), formatDate(r.closedDate), '', '', '', '', r.owner, r.closedBy, r.remarks.toUpperCase()
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', minCellHeight: 40, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [40, 44, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 
        2: { cellWidth: 30, halign: 'left' },
        5: { cellWidth: 15 }, // Closed Date Size Reduced
        6: { cellWidth: 22 }, 7: { cellWidth: 22 }, 8: { cellWidth: 22 }, 9: { cellWidth: 22 },
        12: { cellWidth: 22 } 
      },
      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // Color Coding (Red/Green/Yellow)
        if (data.column.index === 4) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
        if (data.column.index === 12) {
          if (rowData.remarks.toUpperCase() === 'DONE') data.cell.styles.fillColor = [76, 217, 100];
          if (rowData.remarks.toUpperCase().includes('NOT IN BOND')) data.cell.styles.fillColor = [255, 204, 0];
        }

        const drawImg = (url, cell) => { if (url) doc.addImage(url, 'JPEG', cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2); };
        if (data.column.index === 6) drawImg(rowData.before[0], data.cell);
        if (data.column.index === 7) drawImg(rowData.before[1], data.cell);
        if (data.column.index === 8) drawImg(rowData.after[0], data.cell);
        if (data.column.index === 9) drawImg(rowData.after[1], data.cell);
      }
    });

    doc.save(`${project}_Final_Report.pdf`);
  };

  return (
    <div style={ui.container}>
      <header style={ui.nav}><input value={project} onChange={e => setProject(e.target.value)} style={ui.headIn} /></header>
      <div style={ui.main}>
        {rows.map(row => (
          <div key={row.id} style={ui.card}>
            <div style={ui.topRow}>
              <strong>S.No: {row.id}</strong>
              <input style={{...ui.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff0000':'#92d050'}} value={row.status} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} />
            </div>
            
            <textarea placeholder="Description" style={ui.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            
            <div style={ui.photoGrid}>
              <div>
                <label style={ui.upBtn}>📸 Before <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
                <div style={ui.thumbList}>
                  {row.before.map((url, i) => (
                    <div key={i} style={ui.thumbWrap}>
                      <img src={url} style={ui.thumb} alt="before" />
                      <button onClick={() => removePhoto(row.id, 'before', i)} style={ui.delBtn}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={ui.upBtn}>📸 After <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
                <div style={ui.thumbList}>
                  {row.after.map((url, i) => (
                    <div key={i} style={ui.thumbWrap}>
                      <img src={url} style={ui.thumb} alt="after" />
                      <button onClick={() => removePhoto(row.id, 'after', i)} style={ui.delBtn}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <input placeholder="Remarks" style={ui.field} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>
      <div style={ui.footer}>
        <button onClick={addRow} style={ui.btnGreen}>+ ROW</button>
        <button onClick={generatePDF} disabled={isUploading} style={ui.btnBlue}>{isUploading ? 'SYNCING...' : 'GET PDF'}</button>
        <button onClick={clearAll} style={ui.btnRed}>CLEAR ALL</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f4f7fa', minHeight: '100vh', paddingBottom: '110px', fontFamily: 'Arial' },
  nav: { background: '#1a1c1e', padding: '15px', position: 'sticky', top: 0, zIndex: 10 },
  headIn: { width: '100%', background: 'transparent', border: '1px solid #fff', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' },
  main: { padding: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e0e6ed' },
  topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  badge: { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center', fontSize: '12px' },
  area: { width: '100%', height: '65px', borderRadius: '6px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box' },
  photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '12px 0' },
  upBtn: { background: '#f8f9fa', padding: '10px', display: 'block', textAlign: 'center', borderRadius: '6px', border: '1px dashed #adb5bd', fontSize: '12px', cursor: 'pointer' },
  thumbList: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' },
  thumbWrap: { position: 'relative', width: '45px', height: '45px' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' },
  delBtn: { position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  field: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  btnGreen: { flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnBlue: { flex: 1, padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnRed: { padding: '15px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }
};
