import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SharookReplicaApp() {
  const [project, setProject] = useState('Flora villa-75E');
  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('action_register_data');
    return saved ? JSON.parse(saved) : [{ 
      id: 1, date: '7-May-25', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }];
  });

  useEffect(() => {
    localStorage.setItem('action_register_data', JSON.stringify(rows));
  }, [rows]);

  const addRow = () => {
    setRows([...rows, { 
      id: rows.length + 1, date: '', desc: '', loggedBy: '', 
      status: 'Open', closedDate: '', before: [], after: [], 
      owner: '', closedBy: '', remarks: '' 
    }]);
  };

  const handleImageUpload = (id, field, files) => {
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setRows(prev => prev.map(row => 
          row.id === id ? { ...row, [field]: [...row[field], e.target.result] } : row
        ));
      };
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Main Header Table
    autoTable(doc, {
      body: [[project.toUpperCase(), 'ACTION REGISTER - NEW']],
      theme: 'grid',
      styles: { fontSize: 14, fontStyle: 'bold', halign: 'center', cellPadding: 4, fillColor: [211, 211, 211] },
      columnStyles: { 0: { cellWidth: pageWidth / 2 - 14 }, 1: { cellWidth: pageWidth / 2 - 14 } }
    });

    const bodyData = rows.map(r => [
      r.id, r.date, r.desc, r.loggedBy, r.status, r.closedDate, '', '', r.owner, r.closedBy, r.remarks
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: [['Slno', 'Date Logged', 'Description', 'Logged by', 'Current Status', 'Actual Closed Date', 'Photos before', 'Photos After', 'Owner', 'Closed By', 'Remarks']],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [0, 0, 0], minCellHeight: 35 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
      
      didDrawCell: (data) => {
        const rowIndex = data.row.index;
        const row = rows[rowIndex];

        // Status Color Coding
        if (data.column.index === 4) {
          if (row.status === 'Open') data.cell.styles.fillColor = [255, 0, 0]; // Red
          if (row.status === 'Done') data.cell.styles.fillColor = [146, 208, 80]; // Green
        }

        // Remarks Color Coding
        if (data.column.index === 10) {
          if (row.remarks === 'DONE') data.cell.styles.fillColor = [0, 255, 0]; // Green
          if (row.remarks === 'UNABLE TO WORK DUE TO STORE') data.cell.styles.fillColor = [255, 0, 0]; // Red
        }

        // Multiple Photos Before
        if (data.column.index === 6 && row.before.length > 0) {
          row.before.forEach((img, idx) => {
            if (idx < 2) doc.addImage(img, 'JPEG', data.cell.x + 1 + (idx * 12), data.cell.y + 5, 10, 20);
          });
        }

        // Multiple Photos After
        if (data.column.index === 7 && row.after.length > 0) {
          row.after.forEach((img, idx) => {
            if (idx < 2) doc.addImage(img, 'JPEG', data.cell.x + 1 + (idx * 12), data.cell.y + 5, 10, 20);
          });
        }
      }
    });

    doc.save(`${project}.pdf`);
  };

  return (
    <div style={{ padding: '10px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f5f5f5' }}>
      <input style={headerInput} value={project} onChange={e => setProject(e.target.value)} />
      
      <div style={{ overflowX: 'auto' }}>
        <table style={webTableStyle}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th>Slno</th><th>Date</th><th>Description</th><th>Logged By</th><th>Status</th><th>Before</th><th>After</th><th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td><input style={cellInput} value={row.date} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, date: e.target.value} : r))} /></td>
                <td><textarea style={cellText} value={row.desc} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, desc: e.target.value} : r))} /></td>
                <td><input style={cellInput} value={row.loggedBy} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, loggedBy: e.target.value} : r))} /></td>
                <td>
                  <select value={row.status} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, status: e.target.value} : r))}>
                    <option value="Open">Open</option>
                    <option value="Done">Done</option>
                  </select>
                </td>
                <td>
                  <input type="file" multiple onChange={e => handleImageUpload(row.id, 'before', e.target.files)} />
                  <div style={{ fontSize: '10px' }}>{row.before.length} photos</div>
                </td>
                <td>
                  <input type="file" multiple onChange={e => handleImageUpload(row.id, 'after', e.target.files)} />
                  <div style={{ fontSize: '10px' }}>{row.after.length} photos</div>
                </td>
                <td><input style={cellInput} value={row.remarks} onChange={e => setRows(rows.map(r => r.id === row.id ? {...r, remarks: e.target.value} : r))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={addRow} style={btnStyle}>+ ADD ROW</button>
        <button onClick={generatePDF} style={{ ...btnStyle, backgroundColor: '#007bff' }}>DOWNLOAD REPLICA PDF</button>
      </div>
    </div>
  );
}

const headerInput = { width: '100%', padding: '15px', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', border: '2px solid #333', textAlign: 'center' };
const webTableStyle = { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', fontSize: '12px' };
const cellInput = { width: '90%', padding: '5px', border: '1px solid #ccc' };
const cellText = { width: '90%', height: '40px', border: '1px solid #ccc' };
const btnStyle = { padding: '12px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
