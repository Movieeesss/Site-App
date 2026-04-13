import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActionRegisterFinalApp() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v25_final');
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
    localStorage.setItem('site_v25_final', JSON.stringify(rows));
  }, [rows]);

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

  // INDIVIDUAL PHOTO DELETE LOGIC
  const deletePhoto = (rowId, type, photoIndex) => {
    setRows(prev => prev.map(r => r.id === rowId ? {
      ...r, [type]: r[type].filter((_, index) => index !== photoIndex)
    } : r));
  };

  const clearAll = () => {
    if (window.confirm("Kandippa ella data-vum clear pannanuma?")) {
      setRows([{ id: 1, date: '2026-04-13', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
      localStorage.removeItem('site_v25_final');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // 1. STRAIGHT SPLIT HEADER (Fix: image_0d0324.png style)
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 13, fontStyle: 'bold', halign: 'left', cellPadding: 4, fillColor: [211, 211, 211], lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: { 
        0: { cellWidth: 105 }, 
        1: { cellWidth: 172 } 
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
        5: { cellWidth: 15 },
        6: { cellWidth: 22 }, 7: { cellWidth: 22 }, 8: { cellWidth: 22 }, 9: { cellWidth: 22 },
        12: { cellWidth: 22 } 
      },
      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // Status & Remarks Color Logic (Done=Green, Open=Red)
        if (data.column.index === 4) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
        if (data.column.index === 12) {
          if (rowData.remarks.toUpperCase() === 'DONE') data.cell.styles.fillColor = [76, 217, 100];
          if (rowData.remarks.toUpperCase().includes('NOT IN BOND')) data.cell.styles.fillColor = [255, 204, 0];
        }

        // Photo Column Mapping (Exact column placement)
        const drawImg = (url, cell) => { if (url) doc.addImage(url, 'JPEG', cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2); };
        if (data.column.index === 6) drawImg(rowData.before[0], data.cell);
        if (data.column.index === 7) drawImg(rowData.before[1], data.cell);
        if (data.column.index === 8) drawImg(rowData.after[0], data.cell);
        if (data.column.index === 9) drawImg(rowData.after[1], data.cell);
      }
    });

    doc.save(`${project}_ActionRegister.pdf`);
  };

  return (
    <div style={ui.container}>
      <header style={ui.nav}><input value={project} onChange={e => setProject(e.target.value)} style={ui.headIn} /></header>
      <div style={ui.main}>
        {rows.map(row => (
          <div key={row.id} style={ui.card}>
            <div style={ui.topRow}>
              <strong style={{color:'#1a1a1a'}}>ID #{row.id}</strong>
              <input style={{...ui.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff0000':'#92d050'}} value={row.status} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} />
            </div>
            
            <textarea placeholder="Site problem description..." style={ui.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            
            <div style={ui.photoSection}>
              <div>
                <label style={ui.upBtn}>📸 Before <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
                <div style={ui.thumbGrid}>
                  {row.before.map((url, index) => (
                    <div key={index} style={ui.thumbWrapper}>
                      <img src={url} style={ui.thumbImg} alt="before" />
                      <button onClick={() => deletePhoto(row.id, 'before', index)} style={ui.delX}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={ui.upBtn}>📸 After <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
                <div style={ui.thumbGrid}>
                  {row.after.map((url, index) => (
                    <div key={index} style={ui.thumbWrapper}>
                      <img src={url} style={ui.thumbImg} alt="after" />
                      <button onClick={() => deletePhoto(row.id, 'after', index)} style={ui.delX}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <input placeholder="Remarks (DONE / UNABLE...)" style={ui.field} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>
      <div style={ui.footer}>
        <button onClick={addRow} style={ui.btnGreen}>+ ROW</button>
        <button onClick={generatePDF} disabled={isUploading} style={ui.btnBlue}>{isUploading ? 'SYNCING...' : 'GET PDF'}</button>
        <button onClick={clearAll} style={ui.btnRed}>CLEAR</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f5f7fa', minHeight: '100vh', paddingBottom: '120px', fontFamily: 'Arial' },
  nav: { background: '#2c3e50', padding: '18px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  headIn: { width: '100%', background: 'transparent', border: '2px solid #fff', borderRadius: '5px', color: '#fff', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' },
  main: { padding: '15px' },
  card: { background: '#fff', borderRadius: '12px', padding: '18px', marginBottom: '18px', boxShadow: '0 3px 12px rgba(0,0,0,0.06)', border: '1px solid #e1e4e8' },
  topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  badge: { border: 'none', borderRadius: '6px', color: '#fff', padding: '6px 12px', width: '85px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' },
  area: { width: '100%', height: '60px', borderRadius: '8px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box', marginBottom: '10px', fontSize: '14px' },
  photoSection: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '15px 0' },
  upBtn: { background: '#f8f9fa', padding: '12px', display: 'block', textAlign: 'center', borderRadius: '8px', border: '1px dashed #6c757d', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  thumbGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  thumbWrapper: { position: 'relative', width: '50px', height: '50px' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px', border: '1px solid #ddd' },
  delX: { position: 'absolute', top: -6, right: -6, background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  field: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ced4da', boxSizing: 'border-box', fontSize: '14px' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '18px', display: 'flex', gap: '12px', boxShadow: '0 -4px 15px rgba(0,0,0,0.08)', boxSizing: 'border-box' },
  btnGreen: { flex: 1, padding: '16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  btnBlue: { flex: 1, padding: '16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  btnRed: { padding: '16px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }
};
