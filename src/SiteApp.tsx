import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LagFreeReport() {
  const [project, setProject] = useState("Flora villa-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_data_v7');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '7-May-25', desc: '', status: 'Open', before: [], after: [], remarks: '' }];
  });

  useEffect(() => {
    localStorage.setItem('site_data_v7', JSON.stringify(rows));
  }, [rows]);

  // SUPER FAST COMPRESSION: Lag-ah thadukka idhu dhaan mukkiyam
  const compressAndAdd = (id, type, files) => {
    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 120; // Size-ah romba kammi panniyachu
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Quality 0.3 dhaan vechirukken - Lag-ae varaadhu
          const compressedData = canvas.toDataURL('image/jpeg', 0.3);
          
          setRows(prev => prev.map(r => 
            r.id === id ? { ...r, [type]: [...r[type], compressedData] } : r
          ));
        };
      };
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header Table
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
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
      styles: { fontSize: 8, halign: 'center', valign: 'middle', minCellHeight: 40, lineWidth: 0.1 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
      
      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // Status & Remarks Color Fix
        if (data.column.index === 3) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
        if (data.column.index === 6 && rowData.remarks.toUpperCase() === 'DONE') {
          data.cell.styles.fillColor = [0, 255, 0];
        }

        // Sharook 2 Style Photo Rendering
        const drawPhotos = (imgs, cell) => {
          imgs.slice(0, 4).forEach((img, i) => {
            const y = cell.y + 2 + (i * 9);
            doc.setFontSize(5);
            doc.text(`Photo ${i+1}`, cell.x + 1, cell.y + y + 1);
            doc.addImage(img, 'JPEG', cell.x + 1, cell.y + y + 2, 35, 7);
          });
        };

        if (data.column.index === 4) drawPhotos(rowData.before, data.cell);
        if (data.column.index === 5) drawPhotos(rowData.after, data.cell);
      }
    });

    doc.save(`${project}.pdf`);
  };

  return (
    <div style={container}>
      <header style={headStyle}>
        <input value={project} onChange={e => setProject(e.target.value)} style={titleIn} />
      </header>

      <div style={list}>
        {rows.map(row => (
          <div key={row.id} style={card}>
            <div style={cardTop}>
              <span style={{fontWeight:'bold'}}>Item #{row.id}</span>
              <input 
                style={{...badge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff4d4d':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} 
              />
            </div>
            
            <textarea placeholder="Work Description..." style={area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />

            <div style={btnGrid}>
              <label style={upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => compressAndAdd(row.id, 'before', e.target.files)} /></label>
              <label style={upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => compressAndAdd(row.id, 'after', e.target.files)} /></label>
            </div>

            <input placeholder="Remarks (DONE...)" style={remIn} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>

      <div style={footer}>
        <button onClick={() => setRows([...rows, { id: rows.length+1, date: '', desc: '', status: 'Open', before: [], after: [], remarks: '' }])} style={addBtn}>+ ROW</button>
        <button onClick={generatePDF} style={pdfBtn}>GENERATE PDF</button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={clearBtn}>RESET</button>
      </div>
    </div>
  );
}

// Mobile Responsive CSS
const container = { background: '#f0f2f5', minHeight: '100vh', paddingBottom: '100px' };
const headStyle = { background: '#1a1a1a', padding: '15px', textAlign: 'center' };
const titleIn = { background: 'transparent', border: '1px solid #555', color: '#fff', textAlign: 'center', width: '90%', padding: '5px' };
const list = { padding: '10px' };
const card = { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const cardTop = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const badge = { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '70px', textAlign: 'center', fontSize: '11px' };
const area = { width: '100%', height: '50px', border: '1px solid #ddd', borderRadius: '6px', padding: '8px' };
const btnGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '10px 0' };
const upBtn = { background: '#e9ecef', padding: '10px', textAlign: 'center', borderRadius: '6px', fontSize: '12px', border: '1px dashed #999' };
const remIn = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' };
const footer = { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '8px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' };
const addBtn = { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const pdfBtn = { flex: 1, padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const clearBtn = { flex: 1, padding: '12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
