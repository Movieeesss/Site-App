import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function UniqActionRegister() {
  const [projectTitle, setProjectTitle] = useState("FLORA VILLA-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_action_data_v3');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '7-May-25', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }];
  });

  useEffect(() => {
    localStorage.setItem('site_action_data_v3', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { id: newId, date: '', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
  };

  const clearAll = () => {
    if (window.confirm("Are you sure? All data will be deleted!")) {
      setRows([{ id: 1, date: '7-May-25', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
      localStorage.removeItem('site_action_data_v3');
    }
  };

  const handlePhotoUpload = (id, type, files) => {
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 300; 
          const scaleSize = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scaleSize;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], compressed] } : r));
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // 1. Fixed Header (No images will ever overlap here)
    autoTable(doc, {
      body: [[projectTitle.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 12, fontStyle: 'bold', halign: 'center', fillColor: [211, 211, 211], lineWidth: 0.5 },
      columnStyles: { 0: { cellWidth: 135 }, 1: { cellWidth: 135 } }
    });

    const tableData = rows.map(r => [
      r.id, r.date, r.desc, r.loggedBy, r.status, r.closedDate, '', '', r.owner, r.closedBy, r.remarks
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 1,
      head: [['Sino', 'Date Logged', 'Description', 'Logged by', 'Current Status', 'Actual Closed Date', 'Photos before', 'Photos After', 'Owner', 'Closed By', 'Remarks']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [0, 0, 0], minCellHeight: 40 },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      didDrawCell: (data) => {
        // Prevent drawing anything in the header cells (Fix for image_ca4b89.png)
        if (data.section === 'head') return;

        const rowIndex = data.row.index;
        const rowData = rows[rowIndex];

        // Status Color Coding
        if (data.column.index === 4) {
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (s === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }

        // Remarks Color Coding
        if (data.column.index === 10) {
          const r = rowData.remarks.toUpperCase();
          if (r === 'DONE') data.cell.styles.fillColor = [0, 255, 0];
          if (r.includes('UNABLE TO WORK')) data.cell.styles.fillColor = [255, 0, 0];
        }

        // Multiple Photo Rendering (Fits 4 Before and 3 After)
        const renderPhotos = (imgs, cell) => {
          imgs.forEach((img, i) => {
            // Horizontal grid logic to fit up to 4 photos per cell
            const x = cell.x + 1 + (i % 2 * 10); 
            const y = cell.y + 2 + (Math.floor(i / 2) * 18);
            if (i < 4) doc.addImage(img, 'JPEG', x, y, 8.5, 16); 
          });
        };

        if (data.column.index === 6) renderPhotos(rowData.before, data.cell);
        if (data.column.index === 7) renderPhotos(rowData.after, data.cell);
      }
    });

    doc.save(`${projectTitle}.pdf`);
  };

  return (
    <div style={container}>
      <div style={header}>
        <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={headIn} />
      </div>

      <div style={cardContainer}>
        {rows.map(row => (
          <div key={row.id} style={card}>
            <div style={cardRow}>
              <span style={bold}>Item #{row.id}</span>
              <input 
                style={{...statusBadge, backgroundColor: row.status.toUpperCase()==='OPEN' ? '#ff4d4d':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, status: e.target.value} : r))} 
              />
            </div>
            <textarea placeholder="Description" style={area} value={row.desc} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, desc: e.target.value} : r))} />
            <div style={grid}>
              <label style={upBtn}>📷 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'before', e.target.files)} /></label>
              <label style={upBtn}>📷 After ({row.after.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'after', e.target.files)} /></label>
            </div>
            <input placeholder="Remarks (DONE / UNABLE TO WORK...)" style={input} value={row.remarks} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, remarks: e.target.value} : r))} />
          </div>
        ))}
      </div>

      <div style={footer}>
        <button onClick={addRow} style={greenBtn}>+ ROW</button>
        <button onClick={generatePDF} style={blueBtn}>GET PDF</button>
        <button onClick={clearAll} style={clearBtn}>CLEAR ALL</button>
      </div>
    </div>
  );
}

// Mobile Responsive Styles
const container = { background: '#f8f9fa', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'sans-serif' };
const header = { background: '#343a40', padding: '15px', position: 'sticky', top: 0, zIndex: 10 };
const headIn = { width: '100%', background: 'transparent', border: '1px solid #fff', color: '#fff', textAlign: 'center', fontSize: '18px', padding: '5px' };
const cardContainer = { padding: '10px' };
const card = { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const cardRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const statusBadge = { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' };
const area = { width: '100%', height: '70px', borderRadius: '6px', border: '1px solid #ddd', padding: '10px', fontSize: '14px', boxSizing: 'border-box' };
const input = { width: '100%', marginTop: '10px', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' };
const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '15px 0' };
const upBtn = { background: '#e9ecef', border: '1px dashed #6c757d', padding: '10px', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };
const footer = { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' };
const greenBtn = { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const blueBtn = { flex: 1, padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const clearBtn = { flex: 1, padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const bold = { fontWeight: 'bold' };
