import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DynamicPhotoRegister() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem('site_v90_dynamic');
      return saved ? JSON.parse(saved) : [{ 
        id: 1, date: '2026-04-13', desc: '', loggedBy: '', 
        status: 'Open', closedDate: '', before: [], after: [], 
        owner: '', closedBy: '', remarks: '' 
      }];
    } catch (e) {
      return [{ id: 1, date: '2026-04-13', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }];
    }
  });

  const [isUploading, setIsUploading] = useState(false);
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    localStorage.setItem('site_v90_dynamic', JSON.stringify(rows));
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
      } catch (e) { console.error("Upload Error"); }
    }
    setIsUploading(false);
  };

  const deletePhoto = (id, type, index) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: r[type].filter((_, i) => i !== index) } : r));
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // 1. STRAIGHT SPLIT HEADER - HIGH FONT SIZE
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 16, fontStyle: 'bold', halign: 'left', cellPadding: 4, fillColor: [211, 211, 211], lineWidth: 0.5, lineColor: [0, 0, 0] },
      columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 172 } }
    });

    // 2. MAIN TABLE HEADERS
    const head = [['Slno', 'Date', 'Description', 'By', 'Status', 'Closed', 'Photos Before', 'Photos After', 'Owner', 'Remarks']];
    const body = rows.map(r => [r.id, formatDate(r.date), r.desc, r.loggedBy, r.status.toUpperCase(), formatDate(r.closedDate), '', '', r.owner, r.remarks.toUpperCase()]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, halign: 'center', valign: 'middle', minCellHeight: 50, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [40, 44, 52], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      columnStyles: { 
        2: { cellWidth: 35, halign: 'left' }, 
        6: { cellWidth: 45 }, // Photos Before Column
        7: { cellWidth: 45 }, // Photos After Column
        9: { cellWidth: 25 }
      },

      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // Status Colors
        if (data.column.index === 4) {
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (s === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }

        // UNLIMITED PHOTOS GRID LOGIC: Ippo neenga 5 pannaalum 5-um varum
        const drawGrid = (urls, cell) => {
          if (!urls || urls.length === 0) return;
          urls.slice(0, 6).forEach((url, i) => {
            const x = cell.x + 1.5 + (i % 2 * 21.5);
            const y = cell.y + 2 + (Math.floor(i / 2) * 16.5);
            doc.addImage(url, 'JPEG', x, y, 20, 14.5);
            doc.setFontSize(5);
            doc.text(`P${i+1}`, x, y + 1); 
          });
        };

        if (data.column.index === 6) drawGrid(rowData.before, data.cell);
        if (data.column.index === 7) drawGrid(rowData.after, data.cell);
      }
    });

    doc.save(`${project}_Report.pdf`);
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
            <div style={ui.photoGridUI}>
              {['before', 'after'].map(type => (
                <div key={type}>
                  <label style={ui.upBtn}>📸 {type.toUpperCase()} ({row[type].length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, type, e.target.files)} /></label>
                  <div style={ui.thumbGrid}>
                    {row[type].map((url, i) => (
                      <div key={i} style={ui.thumbWrap}>
                        <img src={url} style={ui.thumbImg} />
                        <button onClick={() => deletePhoto(row.id, type, i)} style={ui.delBtn}>×</button>
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
        <button onClick={generatePDF} disabled={isUploading} style={ui.btnBlue}>PDF</button>
        <button onClick={() => {localStorage.clear(); window.location.reload();}} style={ui.btnRed}>RESET</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f4f7fa', minHeight: '100vh', paddingBottom: '110px', fontFamily: 'Arial' },
  nav: { background: '#1a1c1e', padding: '15px', position: 'sticky', top: 0, zIndex: 10 },
  headIn: { width: '100%', background: 'transparent', border: '1px solid #fff', borderRadius: '4px', color: '#fff', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' },
  main: { padding: '12px' },
  card: { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' },
  topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  badge: { border: 'none', borderRadius: '5px', color: '#fff', padding: '6px 12px', width: '85px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' },
  area: { width: '100%', height: '60px', borderRadius: '8px', border: '1px solid #ced4da', padding: '10px', boxSizing: 'border-box' },
  photoGridUI: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '12px 0' },
  upBtn: { background: '#f8f9fa', padding: '10px', display: 'block', textAlign: 'center', borderRadius: '8px', border: '1px dashed #adb5bd', fontSize: '11px', cursor: 'pointer' },
  thumbGrid: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' },
  thumbWrap: { position: 'relative', width: '42px', height: '42px' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' },
  delBtn: { position: 'absolute', top: '-5px', right: '-5px', background: '#ff3b30', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  field: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ced4da', boxSizing: 'border-box' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '18px', display: 'flex', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  btnGreen: { flex: 1, padding: '16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  btnBlue: { flex: 1, padding: '16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' },
  btnRed: { padding: '16px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold' }
};
