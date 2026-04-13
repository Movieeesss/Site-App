import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SharookReplicaFinal() {
  const [project, setProject] = useState("Flora villa-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('flora_site_v6_data');
    return saved ? JSON.parse(saved) : [{ 
      id: 1, date: '7-May-25', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }];
  });

  useEffect(() => {
    localStorage.setItem('flora_site_v6_data', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    const newId = rows.length > 0 ? rows[rows.length - 1].id + 1 : 1;
    setRows([...rows, { 
      id: newId, date: '', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }]);
  };

  const clearAll = () => {
    if (window.confirm("Kandippa data moshama delete pannanuma?")) {
      setRows([{ id: 1, date: '7-May-25', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
      localStorage.removeItem('flora_site_v6_data');
    }
  };

  // LAG FIX: Highly optimized image processor
  const processImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_WIDTH = 150; // VERY small for memory efficiency
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.4)); // 0.4 quality to stop hang
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (id, type, files) => {
    const fileArray = Array.from(files);
    const processedImgs = [];
    for (let file of fileArray) {
      const compressed = await processImage(file);
      processedImgs.push(compressed);
    }
    setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], ...processedImgs] } : r));
  };

  const generatePDF = useCallback(() => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header Table (Exact grid look like sharook 2)
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 11, fontStyle: 'bold', halign: 'center', fillColor: [211, 211, 211], lineWidth: 0.5 },
      columnStyles: { 0: { cellWidth: 138 }, 1: { cellWidth: 138 } }
    });

    const bodyData = rows.map(r => [
      r.id, r.date, r.desc, r.loggedBy, r.status, r.closedDate, '', '', r.owner, r.closedBy, r.remarks
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 1,
      head: [['Slno', 'Date Logged', 'Description', 'Logged by', 'Current Status', 'Actual Closed Date', 'Photos before', 'Photos After', 'Owner', 'Closed By', 'Remarks']],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [0, 0, 0], minCellHeight: 45 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 6: { cellWidth: 40 }, 7: { cellWidth: 40 } }, // Photo columns width control

      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowIndex = data.row.index;
        const rowData = rows[rowIndex];

        // 1. Color Logic (Fix for pdf colors not showing)
        if (data.column.index === 4) { // Status column
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          else if (s === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
        if (data.column.index === 10) { // Remarks column
          const rem = rowData.remarks.toUpperCase();
          if (rem === 'DONE') data.cell.styles.fillColor = [0, 255, 0];
          else if (rem.includes('UNABLE')) data.cell.styles.fillColor = [255, 0, 0];
        }

        // 2. Photo Grid Logic (Fix for photos being wider and missing labels)
        const renderPhotos = (imgs, cell) => {
          imgs.slice(0, 4).forEach((img, idx) => {
            const x = cell.x + 2 + (idx * 9); 
            const y = cell.y + 1 + (idx * 11);
            if (idx < 4) {
              doc.setFontSize(6);
              doc.text(`Photo ${idx + 1}`, cell.x + 1, cell.y + y - 1); // Label: Photo 1, 2...
              doc.addImage(img, 'JPEG', cell.x + 1, cell.y + y, 38, 10); // NOT wider, column controlled
            }
          });
        };

        if (data.column.index === 6 && rowData.before.length > 0) renderPhotos(rowData.before, data.cell);
        if (data.column.index === 7 && rowData.after.length > 0) renderPhotos(rowData.after, data.cell);
      }
    });

    doc.save(`${project}.pdf`);
  }, [project, rows]);

  return (
    <div style={mobileContainer}>
      <div style={header}>
        <input value={project} onChange={e => setProject(e.target.value)} style={headInput} />
      </div>

      <div style={listStyle}>
        {rows.map(row => (
          <div key={row.id} style={card}>
            <div style={rowH}>
              <span>Item #{row.id}</span>
              <input 
                placeholder="Status (Type)" 
                style={{...statusBadge, backgroundColor: row.status.toUpperCase()==='OPEN' ? '#ff4d4d' : '#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, status: e.target.value} : r))} 
              />
            </div>
            <textarea placeholder="Description" style={area} value={row.desc} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, desc: e.target.value} : r))} />
            
            <div style={photoGrid}>
              <label style={upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'before', e.target.files)} /></label>
              <label style={upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'after', e.target.files)} /></label>
            </div>

            <input placeholder="Remarks (Type DONE/UNABLE to WORK...)" style={mobileIn} value={row.remarks} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, remarks: e.target.value} : r))} />
          </div>
        ))}
      </div>

      <div style={stickyFooter}>
        <button onClick={addRow} style={addBtn}>+ ROW</button>
        <button onClick={generatePDF} style={pdfBtn}>GET PDF</button>
        <button onClick={clearAll} style={clearBtn}>CLEAR ALL</button>
      </div>
    </div>
  );
}

// Mobile Interface CSS
const mobileContainer = { background: '#f5f7fa', minHeight: '100vh', paddingBottom: '90px', fontFamily: 'sans-serif' };
const header = { background: '#2c3e50', padding: '15px', position: 'sticky', top: 0, zIndex: 10 };
const headInput = { width: '100%', background: 'transparent', border: '1px solid #fff', color: '#fff', textAlign: 'center', fontSize: '18px', padding: '5px' };
const listStyle = { padding: '10px' };
const card = { background: '#fff', borderRadius: '10px', padding: '15px', marginBottom: '15px', boxShadow: '0 3px 10px rgba(0,0,0,0.05)' };
const rowH = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' };
const statusBadge = { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '80px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' };
const area = { width: '100%', height: '60px', borderRadius: '6px', border: '1px solid #ddd', padding: '8px', boxSizing: 'border-box' };
const mobileIn = { width: '100%', marginTop: '10px', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' };
const photoGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '15px 0' };
const upBtn = { background: '#e9ecef', border: '1px dashed #adb5bd', padding: '10px', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' };
const stickyFooter = { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '12px', display: 'flex', gap: '10px', boxShadow: '0 -2px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' };
const addBtn = { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const pdfBtn = { flex: 1, padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const clearBtn = { flex: 1, padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
