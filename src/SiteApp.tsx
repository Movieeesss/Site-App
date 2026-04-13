import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FinalExcelReplica() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v15_final');
    return saved ? JSON.parse(saved) : [{ 
      id: 1, date: '2026-04-13', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }];
  });

  const [isUploading, setIsUploading] = useState(false);

  // Cloudinary Config
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    localStorage.setItem('site_v15_final', JSON.stringify(rows));
  }, [rows]);

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
        setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], data.secure_url] } : r));
      } catch (e) { console.error("Cloudinary error"); }
    }
    setIsUploading(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Top Main Header
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 13, fontStyle: 'bold', halign: 'center', fillColor: [211, 211, 211], lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: { 0: { cellWidth: 135 }, 1: { cellWidth: 135 } }
    });

    // image_da3ef4.png format Headers
    const head = [[
      'S.No', 'Date Logged', 'Description', 'Logged by', 
      'Current Status', 'Actual Closed Date', 
      'P1(Before)', 'P2(Before)', 'P1(After)', 'P2(After)', 
      'Owner', 'Closed By', 'Remarks'
    ]];

    const body = rows.map(r => [
      r.id, r.date, r.desc, r.loggedBy, 
      r.status.toUpperCase(), r.closedDate, 
      '', '', '', '', 
      r.owner, r.closedBy, r.remarks.toUpperCase()
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', minCellHeight: 50, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [40, 44, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 
        2: { cellWidth: 35, halign: 'left' }, // Description
        4: { cellWidth: 20 }, // Current Status
        6: { cellWidth: 22 }, 7: { cellWidth: 22 }, 8: { cellWidth: 22 }, 9: { cellWidth: 22 },
        12: { cellWidth: 22 } // Remarks
      },

      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowIndex = data.row.index;
        const rowData = rows[rowIndex];

        // 1. Current Status Color Coding
        if (data.column.index === 4) {
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 0, 0]; // Red
          if (s === 'DONE') data.cell.styles.fillColor = [146, 208, 80]; // Green
        }

        // 2. Remarks Color Coding
        if (data.column.index === 12) {
          const rem = rowData.remarks.toUpperCase();
          if (rem === 'DONE') data.cell.styles.fillColor = [76, 217, 100];
          if (rem.includes('NOT IN BOND')) data.cell.styles.fillColor = [255, 204, 0]; // Yellow
        }

        // 3. Dynamic Photo Placement (P1, P2 Columns)
        const drawPhoto = (url, cell) => {
          if (url) {
            doc.addImage(url, 'JPEG', cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2);
          }
        };

        if (data.column.index === 6) drawPhoto(rowData.before[0], data.cell);
        if (data.column.index === 7) drawPhoto(rowData.before[1], data.cell);
        if (data.column.index === 8) drawPhoto(rowData.after[0], data.cell);
        if (data.column.index === 9) drawPhoto(rowData.after[1], data.cell);
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
              <input 
                style={{...ui.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff0000':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} 
              />
            </div>
            <div style={ui.inputGrid}>
              <input placeholder="Logged By" style={ui.field} value={row.loggedBy} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, loggedBy: e.target.value}:r))} />
              <input type="date" style={ui.field} value={row.date} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, date: e.target.value}:r))} />
            </div>
            <textarea placeholder="Work Description" style={ui.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            <div style={ui.photoGrid}>
              <label style={ui.upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
              <label style={ui.upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
            </div>
            <input placeholder="Remarks (DONE / NOT IN BOND SCOPE)" style={ui.field} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>
      <div style={ui.footer}>
        <button onClick={addRow} style={ui.btnGreen}>+ ADD ITEM</button>
        <button onClick={generatePDF} disabled={isUploading} style={ui.btnBlue}>{isUploading ? 'SYNCING...' : 'GET PDF'}</button>
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
  badge: { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' },
  inputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' },
  field: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' },
  area: { width: '100%', height: '65px', borderRadius: '6px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box', marginBottom: '10px' },
  photoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' },
  upBtn: { background: '#f8f9fa', padding: '12px', textAlign: 'center', borderRadius: '6px', border: '1px dashed #adb5bd', fontSize: '12px', cursor: 'pointer' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  btnGreen: { flex: 1, padding: '15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  btnBlue: { flex: 1, padding: '15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }
};
