import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SharookReplicaPro() {
  const [project, setProject] = useState("Flora villa-75E");
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('site_pro_v8');
    return saved ? JSON.parse(saved) : [{ id: 1, date: '7-May-25', desc: '', status: 'Open', before: [], after: [], remarks: '' }];
  });

  useEffect(() => {
    localStorage.setItem('site_pro_v8', JSON.stringify(rows));
  }, [rows]);

  // LAG SOLVED: Image-ah upload pannum bodhe memory-ah save panna compression logic
  const handlePhotoUpload = (id, type, files) => {
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Image size-ah memory-kaga adjust pannuradhu (180px is best for table)
          const MAX_WIDTH = 180; 
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Quality 0.2 vecha dhaan LAG varaadhu
          const compressed = canvas.toDataURL('image/jpeg', 0.2);
          
          setRows(prevRows => prevRows.map(r => 
            r.id === id ? { ...r, [type]: [...r[type], compressed] } : r
          ));
        };
      };
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header Grid (Sharook 1 Look)
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
      // Table cells height adjust for multiple photos
      styles: { fontSize: 7, halign: 'center', valign: 'middle', minCellHeight: 60, lineWidth: 0.1, lineColor: [0,0,0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 4: { cellWidth: 45 }, 5: { cellWidth: 45 } }, // Fixed width to stop "wider" photos

      didDrawCell: (data) => {
        if (data.section === 'head') return;
        const rowData = rows[data.row.index];

        // 1. PDF COLOR CODING (Fix for missing colors)
        if (data.column.index === 3) {
          const s = rowData.status.toUpperCase();
          if (s === 'OPEN') data.cell.styles.fillColor = [255, 0, 0]; // RED
          if (s === 'DONE') data.cell.styles.fillColor = [146, 208, 80]; // GREEN
        }
        if (data.column.index === 6 && rowData.remarks.toUpperCase() === 'DONE') {
          data.cell.styles.fillColor = [0, 255, 0]; // GREEN
        }

        // 2. SHAROOK 2 STYLE PHOTO PLACEMENT (Photo 1, Photo 2 labels)
        const renderPhotosInCell = (imgs, cell) => {
          imgs.slice(0, 4).forEach((img, i) => {
            const labelY = cell.y + 4 + (i * 14); // Dynamic vertical spacing
            const imgY = labelY + 1;
            
            doc.setFontSize(6);
            doc.setTextColor(0,0,0);
            doc.text(`Photo ${i + 1}`, cell.x + 2, labelY); // LABEL: Photo 1, Photo 2...
            doc.addImage(img, 'JPEG', cell.x + 2, imgY, 40, 11); // Width controlled
          });
        };

        if (data.column.index === 4) renderPhotosInCell(rowData.before, data.cell);
        if (data.column.index === 5) renderPhotosInCell(rowData.after, data.cell);
      }
    });

    doc.save(`${project}.pdf`);
  };

  return (
    <div style={container}>
      <div style={appHeader}>
        <input value={project} onChange={e => setProject(e.target.value)} style={titleIn} />
      </div>

      <div style={cardWrapper}>
        {rows.map(row => (
          <div key={row.id} style={card}>
            <div style={cardHeader}>
              <span style={{fontWeight:'bold'}}>ID #{row.id}</span>
              <input 
                style={{...statusBadge, backgroundColor: row.status.toUpperCase()==='OPEN'?'#ff4d4d':'#92d050'}} 
                value={row.status} 
                onChange={e => setRows(rows.map(r => r.id===row.id?{...r, status: e.target.value}:r))} 
              />
            </div>
            
            <textarea placeholder="Description" style={area} value={row.desc} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, desc: e.target.value}:r))} />

            <div style={photoSection}>
              <label style={upBtn}>📸 Before ({row.before.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'before', e.target.files)} /></label>
              <label style={upBtn}>📸 After ({row.after.length}) <input type="file" multiple hidden onChange={e => handlePhotoUpload(row.id, 'after', e.target.files)} /></label>
            </div>

            <input placeholder="Remarks (DONE / UNABLE...)" style={remIn} value={row.remarks} onChange={e => setRows(rows.map(r => r.id===row.id?{...r, remarks: e.target.value}:r))} />
          </div>
        ))}
      </div>

      <div style={footer}>
        <button onClick={() => setRows([...rows, { id: rows.length+1, date: '7-May-25', desc: '', status: 'Open', before: [], after: [], remarks: '' }])} style={addBtn}>+ ROW</button>
        <button onClick={generatePDF} style={pdfBtn}>GENERATE PDF</button>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={clearBtn}>RESET</button>
      </div>
    </div>
  );
}

// Mobile Responsive Interface Styles
const container = { background: '#f8f9fa', minHeight: '100vh', paddingBottom: '90px', fontFamily: 'Arial' };
const appHeader = { background: '#1a1a1a', padding: '15px', position: 'sticky', top: 0, zIndex: 100 };
const titleIn = { background: 'transparent', border: '1px solid #666', color: '#fff', textAlign: 'center', width: '90%', fontSize: '18px' };
const cardWrapper = { padding: '12px' };
const card = { background: '#fff', borderRadius: '12px', padding: '15px', marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' };
const cardHeader = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const statusBadge = { border: 'none', borderRadius: '4px', color: '#fff', padding: '5px', width: '75px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' };
const area = { width: '100%', height: '55px', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', boxSizing: 'border-box' };
const photoSection = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '15px 0' };
const upBtn = { background: '#f1f3f5', padding: '12px', textAlign: 'center', borderRadius: '8px', border: '1px dashed #adb5bd', fontSize: '12px' };
const remIn = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box' };
const footer = { position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', display: 'flex', gap: '8px', boxShadow: '0 -3px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' };
const addBtn = { flex: 1, padding: '14px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const pdfBtn = { flex: 1, padding: '14px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const clearBtn = { flex: 1, padding: '14px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
