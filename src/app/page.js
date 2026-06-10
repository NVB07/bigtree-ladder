"use client";

import { useState, useEffect, useRef } from 'react';

function linesToArray(s) { return String(s || '').split('\n').map(x => x.trim()).filter(Boolean); }
function arrayToLines(a) { return (a || []).join('\n'); }
function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 8); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

const DEFAULT_PROCESS = [
  { title: "Đề xuất", desc: "Quản lý trực tiếp lập phiếu đề xuất kèm minh chứng KPI/năng lực." },
  { title: "HR kiểm tra", desc: "Đối chiếu thời gian, kỷ luật, salary band và hồ sơ đánh giá." },
  { title: "Hội đồng review", desc: "QL + HR + BGĐ đánh giá theo tiêu chí 100 điểm." },
  { title: "Phê duyệt", desc: "Chốt level, chức danh, lương/phụ cấp, ngày hiệu lực." },
  { title: "Theo dõi", desc: "Review sau 2–3 tháng để đảm bảo nhân sự vận hành đúng level mới." }
];

const DEFAULT_MATRIX = [
  {
    title: "Điều kiện tối thiểu",
    items: [
      "Không vi phạm kỷ luật trong kỳ gần nhất.",
      "KPI trung bình đạt từ 80% trở lên.",
      "Được quản lý trực tiếp đề xuất.",
      "Có minh chứng kết quả công việc rõ ràng."
    ]
  },
  {
    title: "Nguyên tắc tăng level",
    items: [
      "Level phản ánh scope và năng lực thực tế.",
      "Không tự động tăng theo thâm niên.",
      "Tăng level phải đi kèm tăng trách nhiệm.",
      "Ưu tiên người tạo ảnh hưởng tích cực tới team."
    ]
  },
  {
    title: "Khung lương thưởng",
    items: [
      "Tăng hiệu suất: 5–10%.",
      "Tăng level: 10–25%.",
      "Nhân sự key: theo phê duyệt BGĐ.",
      "Thưởng theo KPI/campaign/dự án nếu có."
    ]
  }
];

export default function CareerLadderApp() {
  const [data, setData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [activeDept, setActiveDept] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const [expandedRoles, setExpandedRoles] = useState({});
  const fileInputRef = useRef(null);

  const [modal, setModal] = useState({ isOpen: false, type: '', payload: null });

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => {
      setData(d);
      if (d.departments?.[0]) setActiveDept(d.departments[0].id);
    });
  }, []);

  useEffect(() => {
    if (editMode) document.body.classList.add('edit-mode');
    else document.body.classList.remove('edit-mode');
  }, [editMode]);

  const saveData = async (newData) => {
    setData(newData);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      showToast('Đã lưu thay đổi vào data.json');
    } catch(e) {
      showToast('Lỗi khi lưu.');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2600);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bigtree_data.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất dữ liệu.');
  };

  const handleImport = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported.departments || !imported.levels) throw new Error();
        await saveData(imported);
        setActiveDept(imported.departments[0]?.id || '');
        showToast('Nhập dữ liệu thành công.');
      } catch {
        showToast('File không hợp lệ.');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  if (!data) return <div style={{padding:40}}>Đang tải...</div>;

  const currentDept = data.departments.find(d => d.id === activeDept);

  return (
    <div className="page" id="appRoot">
      <section className="hero">
        <div className="eyebrow">🌱 Edtech Bigtree Land · Editable HR Framework</div>
        <h1>Khung chức danh, năng lực & review nhân sự theo phòng ban</h1>
        <p>Dùng cho Ban lãnh đạo, quản lý và toàn bộ nhân sự để hiểu rõ lộ trình phát triển từ Thử việc/TTS → Nhân viên → Chuyên viên → Trưởng nhóm → Trưởng phòng.</p>
        <div className="hero-meta">
          <span className="pill">Phiên bản: Next.js API</span>
          <span className="pill">Lưu dữ liệu trên Server Local</span>
          <span className="pill">Xuất/nhập JSON</span>
          <span className="pill">Có thể in/PDF</span>
        </div>
      </section>

      <section className="toolbar">
        <input className="control" placeholder="Tìm theo vị trí, tiêu chí..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <select className="control" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="all">Tất cả cấp bậc</option>
          {data.levels.map(l => <option key={l.code} value={l.code}>{l.code} · {l.title}</option>)}
        </select>
        <select className="control" value={activeDept} onChange={e => setActiveDept(e.target.value)}>
          {data.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="btn secondary" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Tắt chỉnh sửa' : 'Bật chỉnh sửa'}
        </button>
        <button className="btn" onClick={() => window.print()}>In / PDF</button>
      </section>

      <section className={`editbar ${editMode ? 'active' : ''}`}>
        <span className="hint">Đang ở chế độ chỉnh sửa. Bấm "Sửa" ở từng phòng ban/vị trí. Dữ liệu sẽ lưu thẳng vào file data.json.</span>
        <button className="btn small" onClick={() => setModal({ isOpen: true, type: 'DEPT', payload: null })}>+ Thêm phòng ban</button>
        <button className="btn small secondary" onClick={() => setModal({ isOpen: true, type: 'LEVEL', payload: null })}>+ Thêm cấp bậc</button>
        <button className="btn small secondary" onClick={() => setModal({ isOpen: true, type: 'CRITERIA', payload: null })}>Sửa tiêu chí</button>
        <button className="btn small orange" onClick={handleExport}>Xuất JSON</button>
        <button className="btn small secondary" onClick={() => fileInputRef.current?.click()}>Nhập JSON</button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{display:'none'}} onChange={handleImport} />
      </section>

      <div className="grid">
        <aside className="sidebar">
          <h3>Phòng ban</h3>
          <div>
            {data.departments.map(d => (
              <button key={d.id} className={`dept-btn ${d.id === activeDept ? 'active' : ''}`} onClick={() => setActiveDept(d.id)}>
                <span>{d.icon} {d.name}</span>
                <span className="count">{data.levels.length} level</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="content">
          <section className="card">
            <div className="section-title">
              <div>
                <span className="tag">Tổng quan</span>
                <h2>Career ladder chuẩn hoá cho giai đoạn scale team</h2>
              </div>
            </div>
            <p>Khung này tách rõ <b>level</b>, <b>scope công việc</b>, <b>mức độ tự chủ</b> và <b>giá trị tạo ra</b>. Nhân sự được tăng level khi đã thể hiện năng lực ở cấp cao hơn, không chỉ dựa vào thâm niên.</p>
            <div className="summary-grid">
              <div className="metric"><b>{data.departments.length}</b><span>Nhóm phòng ban</span></div>
              <div className="metric"><b>{data.levels.length}</b><span>Cấp bậc tiêu chuẩn</span></div>
              <div className="metric"><b>{data.criteria.reduce((s, c) => s + (+c[1] || 0), 0)}</b><span>Điểm đánh giá tối đa</span></div>
              <div className="metric"><b>6T</b><span>Chu kỳ review</span></div>
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="tag">Quy trình</span>
                  {editMode && (
                    <button className="btn small secondary" onClick={() => setModal({isOpen: true, type: 'PROCESS', payload: null})}>
                      Sửa quy trình
                    </button>
                  )}
                </div>
                <h2>Quy trình xét tăng level & tăng lương</h2>
              </div>
            </div>
            <div className="process">
              {(data.process || DEFAULT_PROCESS).map((step, idx) => (
                <div key={idx} className="step"><b>{idx + 1}</b>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="tag">Điều kiện chung</span>
                  {editMode && (
                    <button className="btn small secondary" onClick={() => setModal({isOpen: true, type: 'MATRIX', payload: null})}>
                      Sửa nguyên tắc
                    </button>
                  )}
                </div>
                <h2>Nguyên tắc xét duyệt toàn công ty</h2>
              </div>
            </div>
            <div className="matrix">
              {(data.matrix || DEFAULT_MATRIX).map((col, idx) => (
                <div key={idx} className="mini">
                  <h4>{col.title}</h4>
                  <ul>
                    {col.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {currentDept && (
            <section className="card">
              <div className="section-title">
                <div>
                  <span className="tag">{currentDept.icon} {currentDept.name}</span>
                  <h2>{currentDept.name}</h2>
                  <p style={{margin:'8px 0 0',color:'var(--muted)'}}>{currentDept.focus}</p>
                </div>
                {editMode && (
                  <div className="dept-actions">
                    <button className="btn small" onClick={() => setModal({ isOpen: true, type: 'DEPT', payload: currentDept.id })}>Sửa phòng ban</button>
                    <button className="btn small danger" onClick={() => {
                      if(data.departments.length <= 1) return showToast('Cần giữ ít nhất 1 phòng ban');
                      if(confirm('Xóa phòng ban này?')) {
                        const newData = clone(data);
                        newData.departments = newData.departments.filter(d => d.id !== currentDept.id);
                        saveData(newData);
                        setActiveDept(newData.departments[0].id);
                      }
                    }}>Xóa</button>
                  </div>
                )}
                <button className="btn secondary" onClick={() => {
                  const allKeys = data.levels.map(l => l.code);
                  const isAllExpanded = allKeys.every(k => expandedRoles[k]);
                  const newExp = {};
                  if (!isAllExpanded) allKeys.forEach(k => newExp[k] = true);
                  setExpandedRoles(newExp);
                }}>Mở/đóng tất cả</button>
              </div>

              <div className="ladder">
                {data.levels.filter(lvl => {
                  if (levelFilter !== 'all' && lvl.code !== levelFilter) return false;
                  const roleName = currentDept.roles?.[lvl.code] || `${lvl.title} ${currentDept.name}`;
                  const text = (roleName + ' ' + currentDept.name + ' ' + lvl.title + ' ' + lvl.scope).toLowerCase();
                  if (searchQuery && !text.includes(searchQuery.toLowerCase())) return false;
                  return true;
                }).map(lvl => {
                  const roleName = currentDept.roles?.[lvl.code] || `${lvl.title} ${currentDept.name}`;
                  const isOpen = expandedRoles[lvl.code];
                  return (
                    <article key={lvl.code} className={`role ${isOpen ? 'open' : ''}`}>
                      <div className="role-head" onClick={(e) => {
                        if(e.target.closest('.role-actions')) return;
                        setExpandedRoles(prev => ({...prev, [lvl.code]: !prev[lvl.code]}));
                      }}>
                        <div className="role-title">
                          <span className="level-badge">{lvl.code}</span>
                          <div>
                            <h4>{roleName}</h4>
                            <div className="subtitle">{lvl.title} · {lvl.scope}</div>
                          </div>
                        </div>
                        <div>
                          <div className="salary">{lvl.salary}</div>
                          <div className="chev">⌄</div>
                        </div>
                      </div>
                      <div className="role-body">
                        {editMode && (
                          <div className="role-actions">
                            <button className="btn small" onClick={() => setModal({isOpen: true, type: 'ROLE', payload: {deptId: currentDept.id, levelCode: lvl.code}})}>Sửa vị trí này</button>
                            <button className="btn small secondary" onClick={() => setModal({isOpen: true, type: 'LEVEL', payload: lvl.code})}>Sửa cấp bậc {lvl.code}</button>
                          </div>
                        )}
                        <div className="detail-grid">
                          <div className="detail-box">
                            <h5>Yêu cầu</h5>
                            <ul>
                              {(lvl.req || []).map((x,i) => <li key={i}>{x}</li>)}
                              {(currentDept.extra || []).map((x,i) => <li key={`ex-${i}`}>{x}</li>)}
                            </ul>
                          </div>
                          <div className="detail-box">
                            <h5>Trách nhiệm</h5>
                            <ul>{(lvl.resp || []).map((x,i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                          <div className="detail-box">
                            <h5>Quyền hạn</h5>
                            <ul>{(lvl.auth || []).map((x,i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                          <div className="detail-box">
                            <h5>Quyền lợi & lương thưởng</h5>
                            <ul>{(lvl.benefit || []).map((x,i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                        </div>
                        <div style={{marginTop: 14}}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>Bảng điểm đánh giá</h3>
                            {editMode && (
                              <button className="btn small secondary" onClick={() => setModal({isOpen: true, type: 'CRITERIA', payload: null})}>
                                Sửa bảng điểm
                              </button>
                            )}
                          </div>
                          <table className="criteria-table">
                            <thead><tr><th>Tiêu chí</th><th>Điểm</th><th>Mô tả</th></tr></thead>
                            <tbody>
                              {data.criteria.map((c,i) => (
                                <tr key={i}><td><b>{c[0]}</b></td><td className="score">{c[1]}</td><td>{c[2]}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )}
        </main>
      </div>

      <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg}</div>

      {modal.isOpen && (
        <Modal 
          modal={modal} 
          close={() => setModal({ isOpen: false, type: '', payload: null })} 
          data={data} 
          saveData={saveData} 
        />
      )}
    </div>
  );
}

function Modal({ modal, close, data, saveData }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (modal.type === 'CRITERIA') {
      setFormData({ text: data.criteria.map(c => c.join(' | ')).join('\n') });
    } else if (modal.type === 'PROCESS') {
      const p = data.process || DEFAULT_PROCESS;
      setFormData({ text: p.map(x => `${x.title} | ${x.desc}`).join('\n') });
    } else if (modal.type === 'MATRIX') {
      const m = data.matrix || DEFAULT_MATRIX;
      setFormData({ text: m.map(x => `${x.title} | ${x.items.join(' | ')}`).join('\n') });
    } else if (modal.type === 'DEPT') {
      const d = modal.payload ? data.departments.find(x => x.id === modal.payload) : { name: '', icon: '🌿', focus: '', extra: [], roles: {} };
      const roles = {};
      data.levels.forEach(l => roles[l.code] = d?.roles?.[l.code] || `${l.title} - ${d.name}`);
      setFormData({ ...d, extraText: arrayToLines(d.extra), roles });
    } else if (modal.type === 'LEVEL') {
      const l = modal.payload ? data.levels.find(x => x.code === modal.payload) : { code: 'L' + data.levels.length, title: '', scope: '', salary: '', req: [], resp: [], auth: [], benefit: [] };
      setFormData({ ...l, reqTxt: arrayToLines(l.req), respTxt: arrayToLines(l.resp), authTxt: arrayToLines(l.auth), benTxt: arrayToLines(l.benefit) });
    } else if (modal.type === 'ROLE') {
      const { deptId, levelCode } = modal.payload;
      const d = data.departments.find(x => x.id === deptId);
      const l = data.levels.find(x => x.code === levelCode);
      setFormData({ 
        roleName: d.roles[levelCode] || '',
        reqTxt: arrayToLines(l.req), respTxt: arrayToLines(l.resp), authTxt: arrayToLines(l.auth), benTxt: arrayToLines(l.benefit)
      });
    }
  }, [modal, data]);

  const handleSave = () => {
    const newData = clone(data);
    if (modal.type === 'CRITERIA') {
      newData.criteria = linesToArray(formData.text).map(line => {
        const p = line.split('|').map(x => x.trim());
        return [p[0] || 'Tiêu chí', Number(p[1]) || 0, p.slice(2).join(' | ') || ''];
      });
    } else if (modal.type === 'PROCESS') {
      newData.process = linesToArray(formData.text).map(line => {
        const p = line.split('|').map(x => x.trim());
        return { title: p[0] || '', desc: p.slice(1).join(' | ') || '' };
      });
    } else if (modal.type === 'MATRIX') {
      newData.matrix = linesToArray(formData.text).map(line => {
        const p = line.split('|').map(x => x.trim());
        return { title: p[0] || '', items: p.slice(1).filter(Boolean) };
      });
    } else if (modal.type === 'DEPT') {
      const id = modal.payload || uid('dept');
      const dept = {
        id,
        name: formData.name || 'Phòng ban',
        icon: formData.icon || '🌿',
        focus: formData.focus || '',
        extra: linesToArray(formData.extraText),
        roles: formData.roles
      };
      if (modal.payload) {
        const idx = newData.departments.findIndex(x => x.id === modal.payload);
        newData.departments[idx] = dept;
      } else {
        newData.departments.push(dept);
      }
    } else if (modal.type === 'LEVEL') {
      const code = formData.code?.trim();
      if (!code) return alert('Mã level không được trống');
      const lvl = {
        code, title: formData.title, scope: formData.scope, salary: formData.salary,
        req: linesToArray(formData.reqTxt), resp: linesToArray(formData.respTxt),
        auth: linesToArray(formData.authTxt), benefit: linesToArray(formData.benTxt)
      };
      if (modal.payload) {
        const idx = newData.levels.findIndex(x => x.code === modal.payload);
        newData.levels[idx] = lvl;
      } else {
        newData.levels.push(lvl);
        newData.departments.forEach(d => d.roles[code] = `${lvl.title} - ${d.name}`);
      }
    } else if (modal.type === 'ROLE') {
      const { deptId, levelCode } = modal.payload;
      const d = newData.departments.find(x => x.id === deptId);
      const l = newData.levels.find(x => x.code === levelCode);
      d.roles[levelCode] = formData.roleName;
      l.req = linesToArray(formData.reqTxt);
      l.resp = linesToArray(formData.respTxt);
      l.auth = linesToArray(formData.authTxt);
      l.benefit = linesToArray(formData.benTxt);
    }
    saveData(newData);
    close();
  };

  return (
    <div className="modal active">
      <div className="modal-card">
        <div className="modal-head">
          <h3>
            {modal.type === 'CRITERIA' && 'Sửa bảng điểm đánh giá'}
            {modal.type === 'PROCESS' && 'Sửa quy trình xét duyệt'}
            {modal.type === 'MATRIX' && 'Sửa nguyên tắc xét duyệt'}
            {modal.type === 'DEPT' && (modal.payload ? 'Sửa phòng ban' : 'Thêm phòng ban')}
            {modal.type === 'LEVEL' && (modal.payload ? 'Sửa cấp bậc' : 'Thêm cấp bậc')}
            {modal.type === 'ROLE' && 'Sửa vị trí'}
          </h3>
          <button className="btn small secondary" onClick={close}>Đóng</button>
        </div>
        <div className="modal-body">
          {modal.type === 'CRITERIA' && (
            <textarea className="control" style={{minHeight: 300}} value={formData.text || ''} onChange={e => setFormData({...formData, text: e.target.value})} />
          )}
          {modal.type === 'PROCESS' && (
            <>
              <div className="note" style={{marginBottom: 10}}>Mỗi dòng 1 bước. Cú pháp: <b>Tên bước | Mô tả chi tiết</b></div>
              <textarea className="control" style={{minHeight: 300}} value={formData.text || ''} onChange={e => setFormData({...formData, text: e.target.value})} />
            </>
          )}
          {modal.type === 'MATRIX' && (
            <>
              <div className="note" style={{marginBottom: 10}}>Mỗi dòng 1 cột. Cú pháp: <b>Tiêu đề cột | Điều kiện 1 | Điều kiện 2 | ...</b></div>
              <textarea className="control" style={{minHeight: 300}} value={formData.text || ''} onChange={e => setFormData({...formData, text: e.target.value})} />
            </>
          )}
          {modal.type === 'DEPT' && (
            <>
              <div className="form-grid">
                <div className="field"><label>Tên</label><input className="control" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="field"><label>Icon</label><input className="control" value={formData.icon || ''} onChange={e => setFormData({...formData, icon: e.target.value})} /></div>
              </div>
              <div className="field"><label>Mô tả</label><textarea className="control" value={formData.focus || ''} onChange={e => setFormData({...formData, focus: e.target.value})} /></div>
              <div className="field"><label>Yêu cầu đặc thù</label><textarea className="control" value={formData.extraText || ''} onChange={e => setFormData({...formData, extraText: e.target.value})} /></div>
              <h3>Tên vị trí theo cấp bậc</h3>
              <div className="form-grid">
                {data.levels.map(l => (
                  <div key={l.code} className="field">
                    <label>{l.code} · {l.title}</label>
                    <input className="control" value={formData.roles?.[l.code] || ''} onChange={e => setFormData({...formData, roles: {...formData.roles, [l.code]: e.target.value}})} />
                  </div>
                ))}
              </div>
            </>
          )}
          {modal.type === 'LEVEL' && (
            <>
              <div className="form-grid">
                <div className="field"><label>Mã level</label><input className="control" value={formData.code || ''} readOnly={!!modal.payload} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
                <div className="field"><label>Tên level</label><input className="control" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
              </div>
              <div className="field"><label>Phạm vi</label><input className="control" value={formData.scope || ''} onChange={e => setFormData({...formData, scope: e.target.value})} /></div>
              <div className="field"><label>Band lương</label><input className="control" value={formData.salary || ''} onChange={e => setFormData({...formData, salary: e.target.value})} /></div>
              <div className="form-grid">
                <div className="field"><label>Yêu cầu</label><textarea className="control" value={formData.reqTxt || ''} onChange={e => setFormData({...formData, reqTxt: e.target.value})} /></div>
                <div className="field"><label>Trách nhiệm</label><textarea className="control" value={formData.respTxt || ''} onChange={e => setFormData({...formData, respTxt: e.target.value})} /></div>
                <div className="field"><label>Quyền hạn</label><textarea className="control" value={formData.authTxt || ''} onChange={e => setFormData({...formData, authTxt: e.target.value})} /></div>
                <div className="field"><label>Quyền lợi</label><textarea className="control" value={formData.benTxt || ''} onChange={e => setFormData({...formData, benTxt: e.target.value})} /></div>
              </div>
            </>
          )}
          {modal.type === 'ROLE' && (
            <>
              <div className="field"><label>Tên vị trí</label><input className="control" value={formData.roleName || ''} onChange={e => setFormData({...formData, roleName: e.target.value})} /></div>
              <div className="form-grid">
                <div className="field"><label>Yêu cầu cấp bậc</label><textarea className="control" value={formData.reqTxt || ''} onChange={e => setFormData({...formData, reqTxt: e.target.value})} /></div>
                <div className="field"><label>Trách nhiệm</label><textarea className="control" value={formData.respTxt || ''} onChange={e => setFormData({...formData, respTxt: e.target.value})} /></div>
                <div className="field"><label>Quyền hạn</label><textarea className="control" value={formData.authTxt || ''} onChange={e => setFormData({...formData, authTxt: e.target.value})} /></div>
                <div className="field"><label>Quyền lợi</label><textarea className="control" value={formData.benTxt || ''} onChange={e => setFormData({...formData, benTxt: e.target.value})} /></div>
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={close}>Hủy</button>
          <button className="btn" onClick={handleSave}>Lưu thay đổi</button>
        </div>
      </div>
    </div>
  );
}
