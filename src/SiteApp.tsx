import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MobileAppReplica() {
  const [projectTitle, setProjectTitle] = useState("Flora villa-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_action_data_final');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '7-May-25', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }];
  });

  useEffect(() => {
    localStorage.setItem('site_action_data_final', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    const newId = rows.length + 1;
    setRows([...rows, { id: newId, date: '', desc: '', loggedBy: '', status: 'Open', closedDate: '', before: [], after: [], owner: '', closedBy: '', remarks: '' }]);
  };

  // LAG FIX: Highly optimized image compression for Mobile
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
          const maxWidth = 250; // Smaller size for mobile performance
          const scaleSize = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scaleSize;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.6); // 0.6 quality to prevent lag
          setRows(prev => prev.map(r => r.id === id ? { ...r, [type]: [...r[type], compressed] } : r));
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header Table - Exact Excel Grid Look
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
      head: [['Slno', 'Date Logged', 'Description', 'Logged by', 'Current Status', 'Actual Closed Date', 'Photos before', 'Photos After', 'Owner', 'Closed By', 'Remarks']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [0, 0, 0], minCellHeight: 35 },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      didDrawCell: (data) => {
        const rowIndex = data.row.index;
        const rowData = rows[rowIndex];

        // Color Logic: Status & Remarks
        if (data.column.index === 4) {
          if (rowData.status.toUpperCase() === 'OPEN') data.cell.styles.fillColor = [255, 0, 0];
          if (rowData.status.toUpperCase() === 'DONE') data.cell.styles.fillColor = [146, 208, 80];
        }
        if (data.column.index === 10) {
          if (rowData.remarks.toUpperCase() === 'DONE') data.cell.styles.fillColor = [0, 255, 0];
          if (rowData.remarks.toUpperCase().includes('UNABLE')) data.cell.styles.fillColor = [255, 0, 0];
        }

        // Render Photos side-by-side in PDF
        const renderImgs = (imgs, cell) => {
          imgs.slice(0, 3).forEach((img, i) => {
            const x = cell.x + 1 + (i * 8.5);
            doc.addImage(img, 'JPEG', x, cell.y + 4, 7.5, 25);
          });
        };
        if (data.column.index === 6) renderImgs(rowData.before, data.cell);
        if (data.column.index === 7) renderImgs(rowData.after, data.cell);
      }
    });

    doc.save(`${projectTitle}.pdf`);
  };

  return (
    <div style={containerStyle}>
      {/* Mobile Optimized Header */}
      <div style={headerContainer}>
        <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={mobileInput} />
      </div>

      <div style={cardList}>
        {rows.map(row => (
          <div key={row.id} style={mobileCard}>
            <div style={cardHeader}>
              <span>Item #{row.id}</span>
              <input 
                placeholder="Status (Open/Done)" 
                style={{...statusInput, backgroundColor: row.status.toUpperCase() === 'OPEN' ? '#ff4d4d' : '#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, status: e.target.value} : r))} 
              />
            </div>

            <textarea placeholder="Description" style={mobileText} value={row.desc} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, desc: e.target.value} : r))} />
            
            <div style={photoGrid}>
              <label style={photoBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'before', e.target.files)} /></label>
              <label style={photoBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'after', e.target.files)} /></label>
            </div>

            <input placeholder="Remarks (DONE / UNABLE TO WORK...)" style={mobileIn} value={row.remarks} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, remarks: e.target.value} : r))} />
          </div>
        ))}
      </div>

      {/* Floating Action Buttons */}
      <div style={footerBtns}>
        <button onClick={addRow} style={addBtn}>+ ROW</button>
        <button onClick={generatePDF} style={pdfBtn}>GET PDF</button>
      </div>
    </div>
  );
}

// Mobile Interface Styles (CSS-in-JS)
const containerStyle = { background: '#f0f2f5', minHeight: '100vh', paddingBottom: '80px' };
const headerContainer = { background: '#333', padding: '15px', position: 'sticky', top: 0, zIndex: 100 };
const mobileInput = { width: '100%', background: 'transparent', border: '1px solid #fff', color: '#fff', textAlign: 'center', fontSize: '18px', padding: '8px' };
const cardList = { padding: '10px' };
const mobileCard = { background: '#fff', borderRadius: '12px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' };
const cardHeader = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' };
const statusInput = { border: 'none', borderRadius: '4px', padding: '4px 8px', color: '#fff', width: '80px', textAlign: 'center' };
const mobileText = { width: '100%', height: '60px', borderRadius: '6px', border: '1px solid #ddd', padding: '8px', fontSize: '14px' };
const mobileIn = { width: '100%', marginTop: '10px', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' };
const photoGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '10px 0' };
const photoBtn = { background: '#f8f9fa', border: '1px dashed #adb5bd', padding: '10px', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' };
const footerBtns = { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' };
const addBtn = { flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const pdfBtn = { flex: 1, padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
