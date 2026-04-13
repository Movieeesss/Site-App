import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActionRegisterFinal() {
  const [project, setProject] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_v10_data');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '7-May-25', desc: '', status: 'Open', before: [], after: [], remarks: '' }];
  });

  const [isUploading, setIsUploading] = useState(false);

  // Cloudinary Config
  const CLOUD_NAME = "ddkgr27ds"; 
  const UPLOAD_PRESET = "ml_default"; 

  useEffect(() => {
    localStorage.setItem('site_v10_data', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    setRows([...rows, { id: rows.length + 1, date: '', desc: '', status: 'Open', before: [], after: [], remarks: '' }]);
  };

  const clearAll = () => {
    if (window.confirm("Kandippa ella data-vum clear pannanuma?")) {
      setRows([{ id: 1, date: '7-May-25', desc: '', status: 'Open', before: [], after: [], remarks: '' }]);
      localStorage.removeItem('site_v10_data');
    }
  };

  const uploadPhoto = async (id, type, files) => {
    setIsUploading(true);
    for (let file of Array.from(files)) {
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

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header Table
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 12, fontStyle: 'bold', halign: 'center', fillColor: [211, 211, 211], lineWidth: 0.5 },
    });

    // Dynamic Columns Logic [cite: 275, 296]
    // Photo 1, Photo 2, etc. columns dynamic-ah create pannuvom
    const head = [['Sino', 'Date', 'Description', 'Status', 'P1(B)', 'P2(B)', 'P1(A)', 'P2(A)', 'Remarks']];
    
    const body = rows.map(r => [
      r.id, r.date, r.desc, r.status, '', '', '', '', r.remarks
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', minCellHeight: 30, lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
      columnStyles: { 4: { cellWidth: 25 }, 5: { cellWidth: 25 }, 6: { cellWidth: 25 }, 7: { cellWidth: 25 } },

      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // Status & Remarks Color Coding 
        if (data.column.index === 3) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }

        // Render Photos in their specific columns (P1, P2...)
        const drawImg = (url, cell) => {
          if (url) doc.addImage(url, 'JPEG', cell.x + 2, cell.y + 2, cell.width - 4, cell.height - 4);
        };

        if (data.column.index === 4) drawImg(rowData.before[0], data.cell); // Photo 1 Before
        if (data.column.index === 5) drawImg(rowData.before[1], data.cell); // Photo 2 Before
        if (data.column.index === 6) drawImg(rowData.after[0], data.cell);  // Photo 1 After
        if (data.column.index === 7) drawImg(rowData.after[1], data.cell);  // Photo 2 After
      }
    });

    doc.save(`${project}.pdf`);
  };

  return (
    <div style={ui.container}>
      <div style={ui.header}><input value={project} onChange={e => setProject(e.target.value)} style={ui.titleIn} /></div>
      <div style={ui.list}>
        {rows.map(row => (
          <div key={row.id} style={ui.card}>
            <div style={ui.cardTop}>
              <strong>ID #{row.id}</strong>
              <input style={{...ui.badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff4d4d':'#92d050'}} value={row.status} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} />
            </div>
            <textarea placeholder="Description" style={ui.area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />
            <div style={ui.btnGrid}>
              <label style={ui.upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'before', e.target.files)} /></label>
              <label style={ui.upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => uploadPhoto(row.id, 'after', e.target.files)} /></label>
            </div>
            <input placeholder="Remarks" style={ui.input} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>
      <div style={ui.footer}>
        <button onClick={addRow} style={ui.addBtn}>+ ROW</button>
        <button onClick={generatePDF} disabled={isUploading} style={ui.pdfBtn}>{isUploading ? 'Uploading...' : 'GET PDF'}</button>
        <button onClick={clearAll} style={ui.clearBtn}>CLEAR</button>
      </div>
    </div>
  );
}

const ui = {
  container: { background: '#f8f9fa', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'sans-serif' },
  header: { background: '#2c3e50', padding: '15px', position: 'sticky', top: 0, zIndex: 10 },
  titleIn: { width: '100%', background: 'transparent', border: '1px solid #fff', color: '#fff', textAlign: 'center', fontSize: '18px' },
  list: { padding: '10px' },
  card: { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  badge: { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '70px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' },
  area: { width: '100%', height: '50px', borderRadius: '6px', border: '1px solid #ddd', padding: '8px', boxSizing: 'border-box' },
  btnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '15px 0' },
  upBtn: { background: '#f1f3f5', padding: '10px', textAlign: 'center', borderRadius: '6px', border: '1px dashed #999', fontSize: '12px', cursor: 'pointer' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' },
  footer: { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', boxShadow: '0 -2px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' },
  addBtn: { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  pdfBtn: { flex: 1, padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  clearBtn: { padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }
};
