// @ts-nocheck
import { useState, useMemo, useRef, useEffect } from "react";

const injectFont = () => {
  if (!document.getElementById("wms-font")) {
    const l = document.createElement("link");
    l.id = "wms-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(l);
  }
};

const loadJsBarcode = () => new Promise((resolve) => {
  if (window.JsBarcode) return resolve(window.JsBarcode);
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js";
  s.onload = () => resolve(window.JsBarcode);
  document.head.appendChild(s);
});

const PLATFORMS = ["Amazon","eBay","Shopify","Walmart","Etsy","Manual"];
const CONDITIONS = ["New","Used - Like New","Used - Good","Used - Fair","Refurbished"];
const ORDER_STATUSES = ["Pending","Processing","Packed","Shipped","Delivered","Cancelled"];
const SUPPLIER_STATUSES = ["Draft","Sent","Confirmed","Partial","Received","Cancelled"];
const FULFILLMENT_STEPS = ["Awaiting Picking","Picking","Packing","Ready to Ship","Label Assigned","Fulfilled"];
const PKG_TYPES = [{type:"Box",icon:"📦"},{type:"Bubble Mailer",icon:"✉️"},{type:"Poly Mailer",icon:"🗂️"},{type:"Padded Envelope",icon:"📩"},{type:"Tube",icon:"🧻"},{type:"Custom Crate",icon:"🪵"}];
const LOW_STOCK = 10;

const genId = () => Math.random().toString(36).substr(2,9).toUpperCase();
const fmt = (n) => Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const today = () => new Date().toISOString().split("T")[0];
const genSku = () => `SKU-${Date.now().toString().slice(-8)}`;

const SC = {
  Pending:"#f59e0b",Processing:"#3b82f6",Packed:"#8b5cf6",
  Shipped:"#06b6d4",Delivered:"#10b981",Cancelled:"#ef4444",
  Draft:"#6b7280",Sent:"#3b82f6",Confirmed:"#10b981",Partial:"#f59e0b",Received:"#10b981",
  New:"#10b981","Used - Like New":"#3b82f6","Used - Good":"#f59e0b","Used - Fair":"#f97316",Refurbished:"#8b5cf6",
  "Awaiting Picking":"#6b7280",Picking:"#f59e0b",Packing:"#8b5cf6",
  "Ready to Ship":"#3b82f6","Label Assigned":"#06b6d4",Fulfilled:"#10b981",
};

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0c12;--s1:#111520;--s2:#171c2c;--s3:#1e2438;--s4:#252b40;
  --b1:#252d45;--b2:#2e3852;
  --amber:#f5a623;--amber2:#fbbf24;--adim:rgba(245,166,35,.10);
  --t1:#dce6f5;--t2:#8a9bbf;--t3:#4f5f80;
  --red:#ef4444;--green:#10b981;--blue:#3b82f6;--purple:#8b5cf6;--cyan:#06b6d4;
  --mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;
  --sg:#00ff88;
}
body{background:var(--bg);color:var(--t1);font-family:var(--sans);line-height:1.5}
.app{display:flex;min-height:100vh}
.sidebar{width:228px;min-height:100vh;background:var(--s1);border-right:1px solid var(--b1);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0}
.logo{padding:18px 16px 14px;border-bottom:1px solid var(--b1)}
.logo-inner{display:flex;align-items:center;gap:10px}
.logo-bar{width:3px;height:30px;background:var(--amber);border-radius:2px;flex-shrink:0}
.logo-text{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--amber);letter-spacing:.1em;line-height:1.4}
.logo-text span{display:block;font-size:9px;color:var(--t3);font-weight:400;letter-spacing:.08em;margin-top:2px}
.nsec{padding:12px 12px 3px;font-size:9px;font-weight:700;color:var(--t3);letter-spacing:.14em;text-transform:uppercase}
.ni{display:flex;align-items:center;gap:9px;padding:8px 13px;margin:1px 7px;border-radius:7px;cursor:pointer;transition:all .15s;font-size:13px;color:var(--t2);border:1px solid transparent}
.ni:hover{background:var(--s2);color:var(--t1)}
.ni.on{background:var(--adim);color:var(--amber);border-color:rgba(245,166,35,.2)}
.ni-icon{font-size:13px;width:16px;text-align:center;flex-shrink:0}
.nbadge{margin-left:auto;border-radius:10px;font-size:10px;font-weight:700;padding:1px 6px;font-family:var(--mono)}
.nbadge.red{background:var(--red);color:#fff}
.nbadge.amber{background:var(--amber);color:#0a0c12}
.nbadge.blue{background:var(--blue);color:#fff}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.topbar{padding:13px 24px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;background:var(--s1);position:sticky;top:0;z-index:20}
.pt{font-size:16px;font-weight:700;letter-spacing:-.01em}
.ps{font-size:11px;color:var(--t3);font-family:var(--mono);margin-top:2px}
.content{padding:22px;flex:1}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:all .15s;font-family:var(--sans)}
.btn-p{background:var(--amber);color:#0a0c12;border-color:var(--amber)}.btn-p:hover{background:var(--amber2)}
.btn-g{background:transparent;color:var(--t2);border-color:var(--b2)}.btn-g:hover{background:var(--s2);color:var(--t1)}
.btn-d{background:rgba(239,68,68,.1);color:var(--red);border-color:rgba(239,68,68,.25)}.btn-d:hover{background:rgba(239,68,68,.2)}
.btn-ok{background:rgba(16,185,129,.1);color:var(--green);border-color:rgba(16,185,129,.28)}.btn-ok:hover{background:rgba(16,185,129,.2)}
.btn-b{background:rgba(59,130,246,.1);color:var(--blue);border-color:rgba(59,130,246,.28)}.btn-b:hover{background:rgba(59,130,246,.2)}
.btn-sm{padding:5px 11px;font-size:12px}.btn-xs{padding:3px 8px;font-size:11px}
.btn:disabled{opacity:.4;cursor:not-allowed}
.card{background:var(--s1);border:1px solid var(--b1);border-radius:10px}
.ch{padding:12px 17px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;gap:12px}
.ct{font-size:13px;font-weight:600}
.cb{padding:17px}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:11px;margin-bottom:20px}
.sc{background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:15px 17px;position:relative;overflow:hidden}
.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--ac,var(--amber))}
.sl{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:7px}
.sv{font-size:23px;font-weight:700;font-family:var(--mono);color:var(--t1)}
.ss{font-size:11px;color:var(--t3);margin-top:4px;font-family:var(--mono)}
.tw{overflow-x:auto;border-radius:10px;border:1px solid var(--b1)}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{padding:8px 13px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t3);background:var(--s2);border-bottom:1px solid var(--b1);white-space:nowrap}
tbody tr{border-bottom:1px solid var(--b1);transition:background .1s}
tbody tr:last-child{border-bottom:none}
tbody tr:hover{background:var(--s2)}
td{padding:8px 13px;color:var(--t2);vertical-align:middle}
.bdg{display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;font-family:var(--mono);white-space:nowrap}
.inp,.sel,.ta{width:100%;padding:8px 11px;background:var(--s2);border:1px solid var(--b2);border-radius:7px;color:var(--t1);font-size:13px;font-family:var(--sans);transition:border-color .15s;outline:none}
.inp:focus,.sel:focus,.ta:focus{border-color:var(--amber);box-shadow:0 0 0 2px rgba(245,166,35,.1)}
.sel option{background:var(--s2)}.ta{resize:vertical;min-height:70px}
.fl{display:block;font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}
.fg{margin-bottom:13px}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:13px}
.r4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:13px}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.76);z-index:200;display:flex;align-items:center;justify-content:center;padding:18px;animation:fi .15s ease}
.modal{background:var(--s1);border:1px solid var(--b2);border-radius:12px;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;animation:su .2s ease}
.mlg{max-width:860px}.mxl{max-width:1060px}
.mh{padding:15px 19px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--s1);z-index:1}
.mt2{font-size:14px;font-weight:700}
.mb2{padding:19px}
.mf{padding:12px 19px;border-top:1px solid var(--b1);display:flex;gap:9px;justify-content:flex-end}
.mc{background:none;border:none;color:var(--t3);cursor:pointer;font-size:22px;line-height:1;padding:2px}.mc:hover{color:var(--t1)}
.fb{display:flex;gap:9px;margin-bottom:17px;flex-wrap:wrap;align-items:center}
.sw{position:relative;flex:1;min-width:180px}
.sw .inp{padding-left:32px}
.si{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--t3);font-size:13px;pointer-events:none}
.bc-wrap{background:white;border-radius:7px;padding:8px 12px 5px;text-align:center;display:inline-flex;flex-direction:column;align-items:center}
.bc-wrap svg{max-width:100%}
.bc-sku{font-family:var(--mono);font-size:10px;color:#222;margin-top:3px;font-weight:600}
.scan-zone{background:var(--s2);border:2px dashed var(--b2);border-radius:10px;padding:14px;display:flex;align-items:center;gap:11px;transition:border-color .2s;cursor:text}
.scan-zone:focus-within{border-color:var(--sg);box-shadow:0 0 0 3px rgba(0,255,136,.07)}
.scan-inp{background:transparent;border:none;outline:none;color:var(--sg);font-family:var(--mono);font-size:14px;font-weight:600;flex:1;letter-spacing:.08em}
.scan-inp::placeholder{color:var(--t3);font-size:12px;font-weight:400}
.scan-lbl{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.1em}
.scan-ok{color:var(--sg);font-size:11px;font-weight:600;font-family:var(--mono);display:flex;align-items:center;gap:5px}
.pipe{display:flex;align-items:flex-start;gap:0;margin-bottom:20px;overflow-x:auto;padding-bottom:2px}
.pstep{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:96px;position:relative}
.pstep::after{content:'›';position:absolute;right:-8px;top:14px;color:var(--t3);font-size:16px}
.pstep:last-child::after{display:none}
.pdot{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid var(--b2);background:var(--s2);transition:all .2s}
.pdot.done{background:rgba(16,185,129,.14);border-color:var(--green)}
.pdot.active{background:var(--adim);border-color:var(--amber);box-shadow:0 0 10px rgba(245,166,35,.28)}
.pdot.pending{opacity:.45}
.plbl{font-size:9px;color:var(--t3);text-align:center;font-family:var(--mono);white-space:nowrap}
.plbl.active{color:var(--amber);font-weight:700}.plbl.done{color:var(--green)}
.fcard{background:var(--s1);border:1px solid var(--b1);border-radius:12px;margin-bottom:13px}
.fch{padding:13px 17px;display:flex;align-items:center;gap:13px;cursor:pointer;border-bottom:1px solid transparent;transition:background .15s;border-radius:12px}
.fch:hover{background:var(--s2)}
.fcard.open .fch{border-bottom-color:var(--b1);border-radius:12px 12px 0 0}
.fcb{padding:17px}
.pimg{width:56px;height:56px;border-radius:8px;object-fit:cover;background:var(--s3);border:1px solid var(--b1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;overflow:hidden}
.pimg img{width:100%;height:100%;object-fit:cover}
.uzone{width:100%;height:110px;border:2px dashed var(--b2);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;cursor:pointer;transition:border-color .2s;color:var(--t3);font-size:13px}
.uzone:hover{border-color:var(--amber);color:var(--amber)}
.ipr{width:100%;max-height:150px;object-fit:contain;border-radius:8px;border:1px solid var(--b1)}
.pkg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:9px}
.pko{background:var(--s2);border:2px solid var(--b1);border-radius:9px;padding:11px;text-align:center;cursor:pointer;transition:all .15s}
.pko:hover{border-color:var(--b2)}
.pko.sel{border-color:var(--amber);background:var(--adim)}
.pko-icon{font-size:22px;margin-bottom:5px}
.pko-name{font-size:11px;font-weight:600;color:var(--t2)}
.pko-dims{font-size:10px;color:var(--t3);font-family:var(--mono);margin-top:2px}
.scard{background:var(--s1);border:2px solid var(--b1);border-radius:12px;padding:17px;margin-bottom:13px}
.scard.ready{border-color:rgba(59,130,246,.33)}.scard.labeled{border-color:rgba(6,182,212,.38)}.scard.done{border-color:rgba(16,185,129,.38)}
.tabs{display:flex;gap:2px;margin-bottom:19px;background:var(--s2);border-radius:8px;padding:3px;border:1px solid var(--b1)}
.tab{padding:7px 15px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;color:var(--t3);border:none;background:none;font-family:var(--sans)}
.tab.on{background:var(--s1);color:var(--t1);box-shadow:0 1px 4px rgba(0,0,0,.3)}.tab:hover:not(.on){color:var(--t2)}
.plat-grid{display:flex;flex-wrap:wrap;gap:7px}
.plat-chk{display:flex;align-items:center;gap:6px;padding:5px 11px;background:var(--s2);border:1px solid var(--b2);border-radius:6px;cursor:pointer;transition:all .15s}
.plat-chk.on{background:var(--adim);border-color:rgba(245,166,35,.28);color:var(--amber)}
.plat-chk input{display:none}
.plat-lbl{font-size:12px;font-weight:500}
.div{height:1px;background:var(--b1);margin:15px 0}
.empty{text-align:center;padding:50px 20px;color:var(--t3)}
.ei{font-size:34px;margin-bottom:9px;opacity:.4}.et{font-size:14px;font-weight:600;color:var(--t2);margin-bottom:4px}.es{font-size:12px}
.ai{display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--b1)}.ai:last-child{border-bottom:none}
.adot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.pp{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;background:var(--s3);border:1px solid var(--b2);color:var(--t2)}
.chip{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600;background:var(--s3);border:1px solid var(--b2);color:var(--t2);margin:2px}
.sbar{height:3px;border-radius:2px;background:var(--b1);margin-top:3px;overflow:hidden;width:44px}
.sfill{height:100%;border-radius:2px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.mono{font-family:var(--mono)} .amber{color:var(--amber)} .green{color:var(--green)} .red{color:var(--red)} .blue{color:var(--blue)} .muted{color:var(--t3)}
.sm{font-size:12px} .fw6{font-weight:600} .fw7{font-weight:700}
.mt4{margin-top:4px} .mt8{margin-top:8px} .mt12{margin-top:12px} .mt16{margin-top:16px}
.mb12{margin-bottom:12px} .mb16{margin-bottom:16px} .mb20{margin-bottom:20px}
.w100{width:100%} .flex{display:flex} .ic{align-items:center} .gap8{gap:8px} .gap12{gap:12px} .mla{margin-left:auto}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:var(--s1)}::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px}
@keyframes fi{from{opacity:0}to{opacity:1}}
@keyframes su{from{transform:translateY(13px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes sf{0%{background:rgba(0,255,136,.18)}100%{background:transparent}}
.sflash{animation:sf .38s ease}
`;

let _css = false;
const injectCSS = () => {
  if (!_css && !document.getElementById("wms2-css")) {
    const s = document.createElement("style"); s.id = "wms2-css"; s.textContent = CSS;
    document.head.appendChild(s); _css = true;
  }
};

// ── Barcode ──────────────────────────────────────────────────────────────────
const BC = ({ value, h = 48, small = false }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    loadJsBarcode().then((JB) => {
      try { JB(ref.current, value, { format:"CODE128", lineColor:"#000", background:"#fff", height:h, width:small?1.2:1.5, displayValue:false, margin:3 }); } catch(e){}
    });
  }, [value, h]);
  if (!value) return null;
  return (
    <div className="bc-wrap" style={{ padding: small?"5px 8px 3px":"10px 14px 6px" }}>
      <svg ref={ref} />
      <div className="bc-sku" style={{ fontSize: small?9:10 }}>{value}</div>
    </div>
  );
};

// ── Scan Input ───────────────────────────────────────────────────────────────
const ScanIn = ({ label, placeholder, onScan, confirmed, okText }) => {
  const [v, setV] = useState("");
  const ref = useRef(null);
  const zone = useRef(null);
  const go = () => {
    if (!v.trim()) return;
    onScan(v.trim()); setV("");
    zone.current?.classList.add("sflash");
    setTimeout(() => zone.current?.classList.remove("sflash"), 380);
  };
  return (
    <div>
      {label && <div className="scan-lbl" style={{marginBottom:6}}>{label}</div>}
      <div className="scan-zone" ref={zone} onClick={() => ref.current?.focus()}>
        <span style={{fontSize:22}}>⬡</span>
        <input ref={ref} className="scan-inp" value={v} onChange={(e)=>setV(e.target.value)}
          onKeyDown={(e)=>e.key==="Enter"&&go()} placeholder={placeholder||"Scan barcode → Enter"} />
        {confirmed && <div className="scan-ok"><span>✓</span><span>{okText||"Confirmed"}</span></div>}
      </div>
    </div>
  );
};

// ── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, footer, size="" }) => (
  <div className="ov" onClick={(e)=>e.target===e.currentTarget&&onClose()}>
    <div className={`modal ${size}`}>
      <div className="mh"><div className="mt2">{title}</div><button className="mc" onClick={onClose}>×</button></div>
      <div className="mb2">{children}</div>
      {footer && <div className="mf">{footer}</div>}
    </div>
  </div>
);

const Badge = ({label,color}) => <span className="bdg" style={{background:`${color}22`,color,border:`1px solid ${color}44`}}>{label}</span>;
const Empty = ({icon,title,sub,action}) => (
  <div className="empty"><div className="ei">{icon}</div><div className="et">{title}</div><div className="es">{sub}</div>{action&&<div className="mt16">{action}</div>}</div>
);

// ════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ════════════════════════════════════════════════════════════════════════════
const defItem = () => ({
  id:genId(), sku:genSku(), name:"", description:"", condition:"New",
  quantity:0, reorderPoint:5, costPrice:0, sellPrice:0,
  location:"", category:"", notes:"", platforms:[],
  image:null, weight:0, dimL:0, dimW:0, dimH:0,
  isPackaging:false, pkgType:"", createdAt:today(),
});

const PlatSel = ({selected,onChange}) => (
  <div className="plat-grid">
    {PLATFORMS.map(p=>(
      <label key={p} className={`plat-chk ${selected.includes(p)?"on":""}`}>
        <input type="checkbox" checked={selected.includes(p)} onChange={(e)=>onChange(e.target.checked?[...selected,p]:selected.filter(x=>x!==p))} />
        <span className="plat-lbl">{p}</span>
      </label>
    ))}
  </div>
);

const ItemForm = ({item,locations,onChange}) => {
  const imgRef = useRef(null);
  const handleImg = (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload=(ev)=>onChange("image",ev.target.result); r.readAsDataURL(f);
  };
  return (
    <div>
      <div className="fg">
        <label className="fl">Product Image</label>
        {item.image ? (
          <div style={{position:"relative",display:"inline-block"}}>
            <img src={item.image} className="ipr" style={{maxWidth:200}} alt="product" />
            <button className="btn btn-d btn-xs" style={{position:"absolute",top:6,right:6}} onClick={()=>onChange("image",null)}>✕</button>
          </div>
        ) : (
          <div className="uzone" onClick={()=>imgRef.current.click()}>
            <span style={{fontSize:26}}>📷</span><span>Click to upload image</span>
          </div>
        )}
        <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg} />
      </div>
      <div className="r2">
        <div className="fg"><label className="fl">SKU *</label><input className="inp" value={item.sku} onChange={(e)=>onChange("sku",e.target.value)} /></div>
        <div className="fg"><label className="fl">Condition</label>
          <select className="sel" value={item.condition} onChange={(e)=>onChange("condition",e.target.value)}>
            {CONDITIONS.map(c=><option key={c}>{c}</option>)}
          </select></div>
      </div>
      <div className="fg"><label className="fl">Product Name *</label><input className="inp" value={item.name} onChange={(e)=>onChange("name",e.target.value)} placeholder="Product name" /></div>
      <div className="r2">
        <div className="fg"><label className="fl">Category</label><input className="inp" value={item.category} onChange={(e)=>onChange("category",e.target.value)} /></div>
        <div className="fg"><label className="fl">Location</label>
          <select className="sel" value={item.location} onChange={(e)=>onChange("location",e.target.value)}>
            <option value="">— None —</option>
            {locations.map(l=><option key={l.id} value={l.name}>{l.name}</option>)}
          </select></div>
      </div>
      <div className="r3">
        <div className="fg"><label className="fl">Quantity</label><input className="inp" type="number" min="0" value={item.quantity} onChange={(e)=>onChange("quantity",+e.target.value)} /></div>
        <div className="fg"><label className="fl">Cost ($)</label><input className="inp" type="number" min="0" step="0.01" value={item.costPrice} onChange={(e)=>onChange("costPrice",+e.target.value)} /></div>
        <div className="fg"><label className="fl">Sell ($)</label><input className="inp" type="number" min="0" step="0.01" value={item.sellPrice} onChange={(e)=>onChange("sellPrice",+e.target.value)} /></div>
      </div>
      <div className="r4">
        {[["L (cm)","dimL"],["W (cm)","dimW"],["H (cm)","dimH"],["Weight (kg)","weight"]].map(([lbl,k])=>(
          <div className="fg" key={k}><label className="fl">{lbl}</label><input className="inp" type="number" min="0" step="0.1" value={item[k]} onChange={(e)=>onChange(k,+e.target.value)} /></div>
        ))}
      </div>
      <div className="fg"><label className="fl">Reorder Point</label><input className="inp" type="number" min="0" value={item.reorderPoint} onChange={(e)=>onChange("reorderPoint",+e.target.value)} /></div>
      <div className="fg">
        <label className="fl" style={{marginBottom:8}}>Available Platforms</label>
        <PlatSel selected={item.platforms} onChange={(v)=>onChange("platforms",v)} />
      </div>
      <div className="fg"><label className="fl">Notes</label><textarea className="ta" value={item.notes} onChange={(e)=>onChange("notes",e.target.value)} /></div>
      <div className="fg">
        <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <input type="checkbox" checked={item.isPackaging} onChange={(e)=>onChange("isPackaging",e.target.checked)} />
          <span style={{fontSize:13,color:"var(--t2)"}}>This is a packaging supply</span>
        </label>
        {item.isPackaging && (
          <select className="sel" style={{marginTop:9}} value={item.pkgType} onChange={(e)=>onChange("pkgType",e.target.value)}>
            <option value="">— Packaging type —</option>
            {PKG_TYPES.map(p=><option key={p.type} value={p.type}>{p.icon} {p.type}</option>)}
          </select>
        )}
      </div>
    </div>
  );
};

const Inventory = ({inventory,setInventory,locations}) => {
  const [q,setQ] = useState(""); const [fC,setFC] = useState("All"); const [fS,setFS] = useState("All"); const [fP,setFP] = useState("All");
  const [modal,setModal] = useState(null); const [form,setForm] = useState(defItem()); const [bcModal,setBcModal] = useState(null);
  const sc = (qty,rp) => qty===0?"#ef4444":qty<=rp?"#f59e0b":"#10b981";

  const filtered = useMemo(()=>inventory.filter(i=>{
    const lq=q.toLowerCase();
    if(lq&&!i.name.toLowerCase().includes(lq)&&!i.sku.toLowerCase().includes(lq)) return false;
    if(fC!=="All"&&i.condition!==fC) return false;
    if(fS==="In"&&i.quantity===0) return false;
    if(fS==="Low"&&(i.quantity===0||i.quantity>LOW_STOCK)) return false;
    if(fS==="Out"&&i.quantity>0) return false;
    if(fP==="Prod"&&i.isPackaging) return false;
    if(fP==="Pkg"&&!i.isPackaging) return false;
    return true;
  }),[inventory,q,fC,fS,fP]);

  const save = () => {
    if(!form.sku.trim()||!form.name.trim()) return alert("SKU and Name required.");
    if(modal.mode==="add") setInventory(p=>[...p,{...form,id:genId()}]);
    else setInventory(p=>p.map(i=>i.id===form.id?form:i));
    setModal(null);
  };

  return (
    <div>
      <div className="fb">
        <div className="sw"><span className="si">⬡</span><input className="inp" placeholder="Search name or SKU..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
        <select className="sel" style={{width:"auto"}} value={fC} onChange={(e)=>setFC(e.target.value)}>
          <option value="All">All Conditions</option>{CONDITIONS.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="sel" style={{width:"auto"}} value={fS} onChange={(e)=>setFS(e.target.value)}>
          <option value="All">All Stock</option><option value="In">In Stock</option><option value="Low">Low</option><option value="Out">Out</option>
        </select>
        <select className="sel" style={{width:"auto"}} value={fP} onChange={(e)=>setFP(e.target.value)}>
          <option value="All">All Types</option><option value="Prod">Products</option><option value="Pkg">Packaging</option>
        </select>
        <button className="btn btn-p" onClick={()=>{setForm(defItem());setModal({mode:"add"})}}>+ Add Item</button>
      </div>

      {filtered.length===0 ? <Empty icon="📦" title="No items" sub="Add your first inventory item" action={<button className="btn btn-p" onClick={()=>{setForm(defItem());setModal({mode:"add"})}}>+ Add Item</button>} /> : (
        <div className="tw"><table>
          <thead><tr><th></th><th>SKU / Barcode</th><th>Product</th><th>Cond.</th><th>Platforms</th><th>Location</th><th>Qty</th><th>Cost</th><th>Sell</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(item=>{
              const stc = sc(item.quantity,item.reorderPoint);
              return (
                <tr key={item.id}>
                  <td style={{width:52,padding:"5px 8px"}}>
                    <div className="pimg">{item.image?<img src={item.image} alt={item.name} />:<span>{item.isPackaging?"📦":"🏷"}</span>}</div>
                  </td>
                  <td>
                    <button className="btn btn-g btn-xs" style={{fontFamily:"var(--mono)",color:"var(--amber)",marginBottom:4}} onClick={()=>setBcModal(item)}>{item.sku}</button>
                    <div style={{transform:"scale(0.8)",transformOrigin:"left",marginTop:-2}}><BC value={item.sku} h={20} small /></div>
                  </td>
                  <td><div className="fw6" style={{fontSize:13}}>{item.name}</div>{item.category&&<div className="sm muted">{item.category}</div>}</td>
                  <td><Badge label={item.condition} color={SC[item.condition]||"#6b7280"} /></td>
                  <td><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{item.platforms.length===0?<span className="muted sm">—</span>:item.platforms.map(p=><span key={p} className="chip">{p}</span>)}</div></td>
                  <td><span className="mono" style={{fontSize:12}}>{item.location||<span className="muted">—</span>}</span></td>
                  <td>
                    <span className="mono fw6" style={{color:stc}}>{item.quantity}</span>
                    <div className="sbar"><div className="sfill" style={{background:stc,width:`${Math.min((item.quantity/Math.max(item.reorderPoint*3,1))*100,100)}%`}} /></div>
                  </td>
                  <td className="mono">${fmt(item.costPrice)}</td>
                  <td className="mono">${fmt(item.sellPrice)}</td>
                  <td>{item.isPackaging?<Badge label={item.pkgType||"PKG"} color="#8b5cf6" />:<Badge label="Product" color="#3b82f6" />}</td>
                  <td><div className="flex gap8">
                    <button className="btn btn-g btn-xs" onClick={()=>{setForm({...item});setModal({mode:"edit"})}}>Edit</button>
                    <button className="btn btn-d btn-xs" onClick={()=>{if(confirm("Delete?"))setInventory(p=>p.filter(i=>i.id!==item.id))}}>Del</button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      {bcModal && (
        <Modal title={`Barcode — ${bcModal.sku}`} onClose={()=>setBcModal(null)} footer={<button className="btn btn-g" onClick={()=>setBcModal(null)}>Close</button>}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:15,padding:"8px 0"}}>
            {bcModal.image && <img src={bcModal.image} style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:"1px solid var(--b1)"}} />}
            <div style={{fontSize:15,fontWeight:700}}>{bcModal.name}</div>
            <BC value={bcModal.sku} h={70} />
            <div style={{display:"flex",gap:18}}>
              {[["Condition",bcModal.condition],["Qty",bcModal.quantity],["Location",bcModal.location||"—"]].map(([k,v])=>(
                <div key={k} className="sm muted">{k}: <span className="amber">{v}</span></div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal.mode==="add"?"Add Inventory Item":"Edit Item"} onClose={()=>setModal(null)} size="mlg"
          footer={<><button className="btn btn-g" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-p" onClick={save}>{modal.mode==="add"?"Add Item":"Save"}</button></>}>
          <ItemForm item={form} locations={locations} onChange={(k,v)=>setForm(p=>({...p,[k]:v}))} />
          {modal.mode==="add" && (
            <div style={{marginTop:14,padding:"11px 13px",background:"var(--s2)",borderRadius:8,border:"1px solid var(--b1)"}}>
              <div className="fl" style={{marginBottom:7}}>Generated SKU Barcode Preview</div>
              <BC value={form.sku} h={42} small />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════
const defOrder = () => ({
  id:genId(), orderId:`ORD-${Date.now().toString().slice(-6)}`,
  platform:"Manual", customerName:"", customerEmail:"",
  date:today(), status:"Pending", notes:"", items:[], total:0,
  shippingAddress:"", trackingNumber:"", fulfillmentId:null,
});

const Orders = ({orders,setOrders,inventory,setFulfillments}) => {
  const [q,setQ]=useState(""); const [fS,setFS]=useState("All"); const [fP,setFP]=useState("All");
  const [modal,setModal]=useState(null); const [form,setForm]=useState(defOrder());
  const [oItems,setOItems]=useState([]); const [selSku,setSelSku]=useState(""); const [oQty,setOQty]=useState(1);

  const products = useMemo(()=>inventory.filter(i=>!i.isPackaging),[inventory]);
  const filtered = useMemo(()=>orders.filter(o=>{
    const lq=q.toLowerCase();
    if(lq&&!o.orderId.toLowerCase().includes(lq)&&!o.customerName.toLowerCase().includes(lq)) return false;
    if(fS!=="All"&&o.status!==fS) return false;
    if(fP!=="All"&&o.platform!==fP) return false;
    return true;
  }),[orders,q,fS,fP]);

  const addLine = () => {
    const inv=products.find(i=>i.sku===selSku); if(!inv) return;
    setOItems(p=>{const ex=p.find(x=>x.sku===selSku);if(ex)return p.map(x=>x.sku===selSku?{...x,qty:x.qty+oQty}:x);return [...p,{sku:selSku,name:inv.name,price:inv.sellPrice,qty:oQty,invId:inv.id,condition:inv.condition}];});
    setSelSku(""); setOQty(1);
  };
  const tot = (items) => items.reduce((s,x)=>s+x.price*x.qty,0);

  const sendFulfill = (order) => {
    const fId=genId();
    setFulfillments(p=>[...p,{
      id:fId, orderId:order.id, orderRef:order.orderId,
      customerName:order.customerName, platform:order.platform,
      items:order.items, total:order.total, status:"Awaiting Picking",
      createdAt:today(), notes:order.notes,
      pickedSkus:[], packedSkus:[], packaging:null, packagingName:"",
      packageWeight:0, packageL:0, packageW:0, packageH:0,
      labelTrackingNumber:"", labelScanned:false,
      shippingAddress:order.shippingAddress,
    }]);
    setOrders(p=>p.map(o=>o.id===order.id?{...o,status:"Processing",fulfillmentId:fId}:o));
  };

  const save = () => {
    if(!form.customerName.trim()) return alert("Customer name required.");
    const order={...form,items:oItems,total:tot(oItems)};
    if(modal.mode==="add") setOrders(p=>[...p,{...order,id:genId()}]);
    else setOrders(p=>p.map(o=>o.id===form.id?order:o));
    setModal(null); setOItems([]);
  };

  return (
    <div>
      <div className="fb">
        <div className="sw"><span className="si">⬡</span><input className="inp" placeholder="Search orders..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
        <select className="sel" style={{width:"auto"}} value={fS} onChange={(e)=>setFS(e.target.value)}>
          <option value="All">All Statuses</option>{ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select className="sel" style={{width:"auto"}} value={fP} onChange={(e)=>setFP(e.target.value)}>
          <option value="All">All Platforms</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}
        </select>
        <button className="btn btn-p" onClick={()=>{setForm(defOrder());setOItems([]);setModal({mode:"add"})}}>+ New Order</button>
      </div>

      {filtered.length===0 ? <Empty icon="🛒" title="No orders" sub="Create your first order" action={<button className="btn btn-p" onClick={()=>{setForm(defOrder());setOItems([]);setModal({mode:"add"})}}>+ New Order</button>} /> : (
        <div className="tw"><table>
          <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Platform</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{filtered.map(o=>(
            <tr key={o.id}>
              <td><span className="mono fw6 amber">{o.orderId}</span></td>
              <td className="mono sm">{o.date}</td>
              <td><div className="fw6">{o.customerName}</div>{o.customerEmail&&<div className="sm muted">{o.customerEmail}</div>}</td>
              <td><span className="pp">{o.platform}</span></td>
              <td className="mono">{o.items.length}</td>
              <td className="mono amber fw6">${fmt(o.total)}</td>
              <td><Badge label={o.status} color={SC[o.status]} /></td>
              <td><div className="flex gap8">
                {o.status==="Pending"&&!o.fulfillmentId&&<button className="btn btn-ok btn-xs" onClick={()=>sendFulfill(o)}>→ Fulfill</button>}
                {o.fulfillmentId&&<Badge label="In Fulfillment" color="#8b5cf6" />}
                <button className="btn btn-g btn-xs" onClick={()=>{setForm({...o});setOItems([...o.items]);setModal({mode:"edit"})}}>Edit</button>
                <button className="btn btn-d btn-xs" onClick={()=>{if(confirm("Delete?"))setOrders(p=>p.filter(x=>x.id!==o.id))}}>Del</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {modal && (
        <Modal title={modal.mode==="add"?"New Order":"Edit Order"} onClose={()=>{setModal(null);setOItems([])}} size="mlg"
          footer={<><button className="btn btn-g" onClick={()=>{setModal(null);setOItems([])}}>Cancel</button><button className="btn btn-p" onClick={save}>{modal.mode==="add"?"Create":"Save"}</button></>}>
          <div className="r2">
            <div className="fg"><label className="fl">Order ID</label><input className="inp" value={form.orderId} onChange={(e)=>setForm(p=>({...p,orderId:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Platform</label><select className="sel" value={form.platform} onChange={(e)=>setForm(p=>({...p,platform:e.target.value}))}>{PLATFORMS.map(pl=><option key={pl}>{pl}</option>)}</select></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">Customer Name *</label><input className="inp" value={form.customerName} onChange={(e)=>setForm(p=>({...p,customerName:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Email</label><input className="inp" type="email" value={form.customerEmail} onChange={(e)=>setForm(p=>({...p,customerEmail:e.target.value}))} /></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">Date</label><input className="inp" type="date" value={form.date} onChange={(e)=>setForm(p=>({...p,date:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Status</label><select className="sel" value={form.status} onChange={(e)=>setForm(p=>({...p,status:e.target.value}))}>{ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="fg"><label className="fl">Shipping Address</label><input className="inp" value={form.shippingAddress} onChange={(e)=>setForm(p=>({...p,shippingAddress:e.target.value}))} /></div>
          <div className="div" />
          <div className="fl" style={{marginBottom:9}}>Line Items</div>
          <div style={{display:"flex",gap:8,marginBottom:11}}>
            <select className="sel" value={selSku} onChange={(e)=>setSelSku(e.target.value)} style={{flex:2}}>
              <option value="">— Select Product —</option>
              {products.map(i=><option key={i.sku} value={i.sku}>{i.sku} — {i.name} [{i.condition}] (Qty:{i.quantity})</option>)}
            </select>
            <input className="inp" type="number" min="1" value={oQty} onChange={(e)=>setOQty(+e.target.value)} style={{width:65}} />
            <button className="btn btn-g" onClick={addLine} disabled={!selSku}>Add</button>
          </div>
          {oItems.length>0&&(
            <div className="tw mb12"><table>
              <thead><tr><th>SKU</th><th>Name</th><th>Cond.</th><th>Qty</th><th>Price</th><th>Sub</th><th></th></tr></thead>
              <tbody>
                {oItems.map(item=>(
                  <tr key={item.sku}>
                    <td className="mono">{item.sku}</td><td>{item.name}</td>
                    <td><Badge label={item.condition} color={SC[item.condition]||"#6b7280"} /></td>
                    <td className="mono">{item.qty}</td><td className="mono">${fmt(item.price)}</td>
                    <td className="mono amber">${fmt(item.price*item.qty)}</td>
                    <td><button className="btn btn-d btn-xs" onClick={()=>setOItems(p=>p.filter(x=>x.sku!==item.sku))}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
          <div className="fg"><label className="fl">Notes</label><textarea className="ta" value={form.notes} onChange={(e)=>setForm(p=>({...p,notes:e.target.value}))} /></div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FULFILLMENT
// ════════════════════════════════════════════════════════════════════════════
const Pipeline = ({status}) => {
  const idx = FULFILLMENT_STEPS.indexOf(status);
  const icons = ["📋","🔍","📦","🚀","🏷","✅"];
  return (
    <div className="pipe">
      {FULFILLMENT_STEPS.map((step,i)=>(
        <div className="pstep" key={step}>
          <div className={`pdot ${i<idx?"done":i===idx?"active":"pending"}`}>{icons[i]}</div>
          <div className={`plbl ${i<idx?"done":i===idx?"active":""}`}>{step}</div>
        </div>
      ))}
    </div>
  );
};

const FCard = ({f,inventory,setFulfillments,setOrders}) => {
  const [open,setOpen]=useState(false);
  const [err,setErr]=useState("");
  const setE = (msg) => { setErr(msg); setTimeout(()=>setErr(""),3500); };
  const upd = (patch) => setFulfillments(p=>p.map(x=>x.id===f.id?{...x,...patch}:x));
  const products = useMemo(()=>inventory.filter(i=>!i.isPackaging),[inventory]);
  const packaging = useMemo(()=>inventory.filter(i=>i.isPackaging),[inventory]);

  const sugPkg = useMemo(()=>{
    const its=f.items.map(oi=>products.find(p=>p.sku===oi.sku)).filter(Boolean);
    const mL=Math.max(...its.map(i=>i.dimL||0),0), mW=Math.max(...its.map(i=>i.dimW||0),0), mH=Math.max(...its.map(i=>i.dimH||0),0);
    const wt=its.reduce((s,i)=>s+(i.weight||0),0), vol=mL*mW*mH;
    if(vol===0) return null;
    if(wt<0.5&&mL<35&&mW<25) return "Bubble Mailer";
    if(wt<1&&mL<40&&mW<30) return "Padded Envelope";
    if(vol<5000) return "Poly Mailer";
    return "Box";
  },[f.items,products]);

  const onPickScan = (sku) => {
    if(!f.items.find(i=>i.sku===sku)) return setE(`SKU ${sku} not in this order`);
    if(f.pickedSkus.includes(sku)) return setE(`${sku} already scanned`);
    const np=[...f.pickedSkus,sku];
    upd({pickedSkus:np,status:f.items.every(i=>np.includes(i.sku))?"Packing":"Picking"});
  };
  const onPackScan = (sku) => {
    if(!f.items.find(i=>i.sku===sku)) return setE(`SKU ${sku} not in this order`);
    if(f.packedSkus.includes(sku)) return setE(`${sku} already packed`);
    upd({packedSkus:[...f.packedSkus,sku]});
  };
  const onPkgScan = (sku) => {
    const pkg=packaging.find(i=>i.sku===sku);
    if(!pkg) return setE(`Packaging SKU ${sku} not found`);
    upd({packaging:pkg.sku,packagingName:pkg.name});
  };

  const allPacked = f.items.every(i=>f.packedSkus.includes(i.sku));
  const canReady = allPacked && f.packaging && f.packageWeight>0;

  const markReady = () => {
    upd({status:"Ready to Ship"});
    setOrders(p=>p.map(o=>o.fulfillmentId===f.id?{...o,status:"Packed"}:o));
  };
  const onLabelScan = (val) => {
    upd({labelTrackingNumber:val,status:"Label Assigned"});
    setOrders(p=>p.map(o=>o.fulfillmentId===f.id?{...o,trackingNumber:val,status:"Shipped"}:o));
  };
  const onVerify = (val) => {
    if(val===f.labelTrackingNumber) {
      upd({labelScanned:true,status:"Fulfilled"});
      setOrders(p=>p.map(o=>o.fulfillmentId===f.id?{...o,status:"Delivered"}:o));
    } else setE(`Mismatch! Expected: ${f.labelTrackingNumber}`);
  };

  const s=f.status;
  const inPacking = s==="Packing"||s==="Ready to Ship"||s==="Label Assigned"||s==="Fulfilled";

  return (
    <div className={`fcard ${open?"open":""}`} style={{borderColor:open?SC[s]+"55":"var(--b1)"}}>
      <div className="fch" onClick={()=>setOpen(x=>!x)}>
        <div style={{fontSize:18}}>{open?"▾":"▸"}</div>
        <div>
          <div style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--amber)",fontSize:14}}>{f.orderRef}</div>
          <div className="sm muted">{f.customerName} · <span className="pp" style={{fontSize:10}}>{f.platform}</span></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:11,marginLeft:"auto"}}>
          <div className="sm muted mono">{f.items.length} items · ${fmt(f.total)}</div>
          <Badge label={s} color={SC[s]} />
        </div>
      </div>

      {open && (
        <div className="fcb">
          <Pipeline status={s} />

          {/* Items table */}
          <div className="card mb16">
            <div className="ch"><span className="ct">📦 Order Items & Locations</span></div>
            <table>
              <thead><tr><th>Barcode / SKU</th><th>Product</th><th>Condition</th><th>Location</th><th>Qty</th><th>Picked</th><th>Packed</th></tr></thead>
              <tbody>
                {f.items.map(oi=>{
                  const inv=products.find(p=>p.sku===oi.sku);
                  const picked=f.pickedSkus.includes(oi.sku), packed=f.packedSkus.includes(oi.sku);
                  return (
                    <tr key={oi.sku}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          {inv?.image&&<img src={inv.image} style={{width:30,height:30,objectFit:"cover",borderRadius:5,border:"1px solid var(--b1)"}} />}
                          <BC value={oi.sku} h={24} small />
                        </div>
                      </td>
                      <td><div className="fw6">{oi.name}</div></td>
                      <td><Badge label={oi.condition} color={SC[oi.condition]||"#6b7280"} /></td>
                      <td>{inv?.location
                        ?<span style={{background:"var(--adim)",color:"var(--amber)",fontFamily:"var(--mono)",fontSize:11,padding:"2px 8px",borderRadius:5,border:"1px solid rgba(245,166,35,.28)"}}>📍 {inv.location}</span>
                        :<span className="muted sm">No location set</span>}</td>
                      <td className="mono">{oi.qty}</td>
                      <td>{picked?<span className="green fw6">✓</span>:<span className="muted">—</span>}</td>
                      <td>{packed?<span className="green fw6">✓</span>:<span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Step 1: Pick */}
          {(s==="Awaiting Picking"||s==="Picking") && (
            <div className="card mb16">
              <div className="ch">
                <span className="ct">🔍 Step 1 — Pick Items</span>
                <span className="sm muted mono">{f.pickedSkus.length}/{f.items.length} scanned</span>
              </div>
              <div className="cb">
                <ScanIn label="Scan product SKU barcode to confirm pick" onScan={onPickScan} />
                {err&&<div style={{color:"var(--red)",fontSize:12,marginTop:7,fontFamily:"var(--mono)"}}>⚠ {err}</div>}
                <div className="mt12">
                  {f.items.map(oi=>{
                    const done=f.pickedSkus.includes(oi.sku);
                    const inv=products.find(p=>p.sku===oi.sku);
                    return (
                      <div key={oi.sku} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid var(--b1)"}}>
                        <span style={{fontSize:15}}>{done?"✅":"⬜"}</span>
                        <BC value={oi.sku} h={20} small />
                        <span style={{fontSize:13,color:done?"var(--green)":"var(--t2)"}}>{oi.name}</span>
                        {inv?.location&&<span style={{marginLeft:"auto",color:"var(--amber)",fontSize:11,fontFamily:"var(--mono)"}}>📍 {inv.location}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Packaging */}
          {inPacking && (
            <div className="card mb16">
              <div className="ch">
                <span className="ct">📦 Step 2 — Select Packaging</span>
                {f.packaging&&<Badge label="✓ Confirmed" color="#10b981" />}
              </div>
              <div className="cb">
                {sugPkg&&!f.packaging&&(
                  <div style={{background:"var(--adim)",border:"1px solid rgba(245,166,35,.22)",borderRadius:8,padding:"9px 13px",marginBottom:13}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--amber)",marginBottom:3}}>💡 SUGGESTED PACKAGING</div>
                    <div style={{fontSize:14,fontWeight:600}}>{PKG_TYPES.find(p=>p.type===sugPkg)?.icon} {sugPkg}</div>
                    <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Based on product dimensions & weight</div>
                  </div>
                )}
                {packaging.length>0 ? (
                  <>
                    <div className="fl" style={{marginBottom:9}}>Available Packaging — Click or scan to confirm</div>
                    <div className="pkg-grid mb12">
                      {packaging.map(pkg=>(
                        <div key={pkg.sku} className={`pko ${f.packaging===pkg.sku?"sel":""}`} onClick={()=>upd({packaging:pkg.sku,packagingName:pkg.name})}>
                          <div className="pko-icon">{PKG_TYPES.find(p=>p.type===pkg.pkgType)?.icon||"📦"}</div>
                          <div className="pko-name">{pkg.name}</div>
                          <div className="pko-dims">{pkg.sku}</div>
                          {pkg.dimL>0&&<div className="pko-dims">{pkg.dimL}×{pkg.dimW}×{pkg.dimH}cm</div>}
                        </div>
                      ))}
                    </div>
                    <ScanIn label="Or scan packaging barcode" onScan={onPkgScan} confirmed={!!f.packaging} okText={f.packagingName} />
                  </>
                ) : (
                  <div className="muted sm">No packaging in inventory. Add items marked as "packaging supply".</div>
                )}
              </div>
            </div>
          )}

          {/* Step 2b: Pack items */}
          {inPacking && (
            <div className="card mb16">
              <div className="ch">
                <span className="ct">✅ Step 2b — Scan Items Into Package</span>
                <span className="sm muted mono">{f.packedSkus.length}/{f.items.length} packed</span>
              </div>
              <div className="cb">
                <ScanIn label="Scan each item as it goes into the package" onScan={onPackScan} />
                {err&&<div style={{color:"var(--red)",fontSize:12,marginTop:7,fontFamily:"var(--mono)"}}>⚠ {err}</div>}
                <div className="mt12">
                  {f.items.map(oi=>{
                    const done=f.packedSkus.includes(oi.sku);
                    return (
                      <div key={oi.sku} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid var(--b1)"}}>
                        <span style={{fontSize:15}}>{done?"✅":"⬜"}</span>
                        <BC value={oi.sku} h={20} small />
                        <span style={{fontSize:13,color:done?"var(--green)":"var(--t2)"}}>{oi.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Dimensions */}
          {inPacking && (
            <div className="card mb16">
              <div className="ch"><span className="ct">📐 Package Dimensions & Weight</span></div>
              <div className="cb">
                <div className="r4">
                  {[["L (cm)","packageL"],["W (cm)","packageW"],["H (cm)","packageH"],["Weight (kg)","packageWeight"]].map(([lbl,k])=>(
                    <div className="fg" key={k}><label className="fl">{lbl}</label>
                      <input className="inp" type="number" min="0" step="0.1" value={f[k]} onChange={(e)=>upd({[k]:+e.target.value})} />
                    </div>
                  ))}
                </div>
                {s==="Packing" && (
                  <>
                    <button className="btn btn-p w100" disabled={!canReady} onClick={markReady} style={{marginTop:4}}>🚀 Mark Ready to Ship</button>
                    {!canReady && (
                      <div style={{color:"var(--t3)",fontSize:11,marginTop:5,fontFamily:"var(--mono)"}}>
                        {!allPacked&&"· Pack all items  "}{!f.packaging&&"· Select packaging  "}{!f.packageWeight&&"· Enter weight"}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Ready to Ship / Label / Fulfilled */}
          {(s==="Ready to Ship"||s==="Label Assigned"||s==="Fulfilled") && (
            <div className={`scard ${s==="Ready to Ship"?"ready":s==="Label Assigned"?"labeled":"done"}`}>
              <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:13}}>
                <div style={{fontSize:22}}>{s==="Fulfilled"?"✅":s==="Label Assigned"?"🏷":"🚀"}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{s==="Fulfilled"?"Fully Fulfilled":s==="Label Assigned"?"Label Assigned":"Ready to Ship"}</div>
                  <div className="sm muted">{f.orderRef} · {f.customerName}</div>
                </div>
                <div style={{marginLeft:"auto"}}><Badge label={s} color={SC[s]} /></div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:13}}>
                {[["Package",`${f.packageL}×${f.packageW}×${f.packageH} cm`],["Weight",`${f.packageWeight} kg`],["Packaging",f.packagingName||f.packaging||"—"],["Ship To",f.shippingAddress||"—"]].map(([k,v])=>(
                  <div key={k} style={{background:"var(--s2)",borderRadius:7,padding:"8px 11px"}}>
                    <div className="sm muted">{k}</div>
                    <div style={{fontFamily:"var(--mono)",fontSize:12,marginTop:2}}>{v}</div>
                  </div>
                ))}
              </div>

              {s==="Ready to Ship" && (
                <div>
                  <div style={{background:"rgba(59,130,246,.07)",border:"1px solid rgba(59,130,246,.18)",borderRadius:8,padding:"9px 13px",marginBottom:11}}>
                    <div style={{fontSize:11,color:"var(--blue)",fontWeight:700,marginBottom:3}}>📋 NEXT STEP</div>
                    <div style={{fontSize:12,color:"var(--t2)"}}>Generate your shipping label in your external carrier system, then scan or type the tracking number below to assign it.</div>
                  </div>
                  <ScanIn label="Scan or enter tracking number to assign label" placeholder="Scan tracking barcode → Enter" onScan={onLabelScan} />
                </div>
              )}

              {s==="Label Assigned" && (
                <div>
                  <div style={{background:"rgba(6,182,212,.07)",border:"1px solid rgba(6,182,212,.22)",borderRadius:8,padding:"9px 13px",marginBottom:11}}>
                    <div style={{fontSize:11,color:"var(--cyan)",fontWeight:700,marginBottom:3}}>🏷 LABEL ASSIGNED</div>
                    <div style={{fontFamily:"var(--mono)",fontSize:13}}>{f.labelTrackingNumber}</div>
                    <div className="sm muted mt4">Now scan the label one more time to verify and complete fulfilment.</div>
                  </div>
                  <ScanIn label="Final verification — scan the label to complete" placeholder="Scan label barcode → Enter" onScan={onVerify} />
                  {err&&<div style={{color:"var(--red)",fontSize:12,marginTop:7,fontFamily:"var(--mono)"}}>⚠ {err}</div>}
                </div>
              )}

              {s==="Fulfilled" && (
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <div style={{fontSize:30,marginBottom:7}}>🎉</div>
                  <div style={{fontWeight:700,color:"var(--green)",fontSize:15}}>Order Completely Fulfilled</div>
                  <div className="mono sm muted mt4">Tracking: {f.labelTrackingNumber}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Fulfillment = ({fulfillments,setFulfillments,inventory,setOrders}) => {
  const [tab,setTab]=useState("active"); const [q,setQ]=useState("");
  const active=fulfillments.filter(f=>f.status!=="Fulfilled");
  const fulfilled=fulfillments.filter(f=>f.status==="Fulfilled");
  const ready=fulfillments.filter(f=>f.status==="Ready to Ship"||f.status==="Label Assigned");
  const shown=(tab==="active"?active:tab==="ready"?ready:fulfilled)
    .filter(f=>!q||f.orderRef.toLowerCase().includes(q.toLowerCase())||f.customerName.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="sg">
        {[
          {label:"Awaiting Pick",value:active.filter(f=>f.status==="Awaiting Picking").length,ac:"#6b7280"},
          {label:"Picking / Packing",value:active.filter(f=>["Picking","Packing"].includes(f.status)).length,ac:"#f59e0b"},
          {label:"Ready to Ship",value:ready.length,ac:"#3b82f6"},
          {label:"Fulfilled",value:fulfilled.length,ac:"#10b981"},
        ].map(s=><div className="sc" key={s.label} style={{"--ac":s.ac}}><div className="sl">{s.label}</div><div className="sv">{s.value}</div></div>)}
      </div>
      <div className="fb">
        <div className="sw"><span className="si">⬡</span><input className="inp" placeholder="Search..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
      </div>
      <div className="tabs">
        <button className={`tab ${tab==="active"?"on":""}`} onClick={()=>setTab("active")}>Active ({active.length})</button>
        <button className={`tab ${tab==="ready"?"on":""}`} onClick={()=>setTab("ready")}>Ready to Ship ({ready.length})</button>
        <button className={`tab ${tab==="done"?"on":""}`} onClick={()=>setTab("done")}>Fulfilled ({fulfilled.length})</button>
      </div>
      {shown.length===0
        ?<Empty icon="📬" title="Nothing here" sub={tab==="active"?"Send orders to fulfillment from Orders tab":tab==="ready"?"No packages ready yet":"Fulfilled orders appear here"} />
        :shown.map(f=><FCard key={f.id} f={f} inventory={inventory} setFulfillments={setFulfillments} setOrders={setOrders} />)
      }
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ════════════════════════════════════════════════════════════════════════════
const defPO = () => ({id:genId(),poNumber:`PO-${Date.now().toString().slice(-6)}`,supplier:"",contactEmail:"",date:today(),expectedDate:"",status:"Draft",notes:"",items:[],total:0});

const Suppliers = ({suppliers,setSuppliers,inventory}) => {
  const [q,setQ]=useState(""); const [modal,setModal]=useState(null);
  const [form,setForm]=useState(defPO()); const [pis,setPis]=useState([]);
  const [ss,setSs]=useState(""); const [sq,setSq]=useState(1); const [sp,setSp]=useState(0);
  const tot=(items)=>items.reduce((s,x)=>s+x.unitCost*x.qty,0);
  const addI=()=>{const inv=inventory.find(i=>i.sku===ss);if(!inv)return;setPis(p=>{const ex=p.find(x=>x.sku===ss);if(ex)return p.map(x=>x.sku===ss?{...x,qty:x.qty+sq}:x);return [...p,{sku:ss,name:inv.name,qty:sq,unitCost:sp}];});setSs("");setSq(1);setSp(0);};
  const save=()=>{if(!form.supplier.trim())return alert("Supplier required.");const po={...form,items:pis,total:tot(pis)};if(modal.mode==="add")setSuppliers(p=>[...p,{...po,id:genId()}]);else setSuppliers(p=>p.map(s=>s.id===form.id?po:s));setModal(null);setPis([]);};
  const filt=suppliers.filter(s=>!q||s.supplier.toLowerCase().includes(q.toLowerCase())||s.poNumber.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="fb">
        <div className="sw"><span className="si">⬡</span><input className="inp" placeholder="Search POs..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
        <button className="btn btn-p" onClick={()=>{setForm(defPO());setPis([]);setModal({mode:"add"})}}>+ New PO</button>
      </div>
      {filt.length===0?<Empty icon="🏭" title="No purchase orders" sub="Create your first PO" action={<button className="btn btn-p" onClick={()=>{setForm(defPO());setPis([]);setModal({mode:"add"})}}>+ New PO</button>} />:(
        <div className="tw"><table><thead><tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Expected</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{filt.map(po=>(
            <tr key={po.id}>
              <td><span className="mono fw6 amber">{po.poNumber}</span></td>
              <td><div className="fw6">{po.supplier}</div>{po.contactEmail&&<div className="sm muted">{po.contactEmail}</div>}</td>
              <td className="mono sm">{po.date}</td><td className="mono sm">{po.expectedDate||<span className="muted">—</span>}</td>
              <td className="mono">{po.items.length}</td><td className="mono amber fw6">${fmt(po.total)}</td>
              <td><select className="sel" style={{width:"auto",padding:"3px 8px",fontSize:12}} value={po.status} onChange={(e)=>setSuppliers(p=>p.map(s=>s.id===po.id?{...s,status:e.target.value}:s))}>{SUPPLIER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></td>
              <td><div className="flex gap8">
                <button className="btn btn-g btn-xs" onClick={()=>{setForm({...po});setPis([...po.items]);setModal({mode:"edit"})}}>Edit</button>
                <button className="btn btn-d btn-xs" onClick={()=>{if(confirm("Delete?"))setSuppliers(p=>p.filter(s=>s.id!==po.id))}}>Del</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {modal&&(
        <Modal title={modal.mode==="add"?"New PO":"Edit PO"} onClose={()=>{setModal(null);setPis([])}} size="mlg"
          footer={<><button className="btn btn-g" onClick={()=>{setModal(null);setPis([])}}>Cancel</button><button className="btn btn-p" onClick={save}>Save</button></>}>
          <div className="r2">
            <div className="fg"><label className="fl">PO Number</label><input className="inp" value={form.poNumber} onChange={(e)=>setForm(p=>({...p,poNumber:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Status</label><select className="sel" value={form.status} onChange={(e)=>setForm(p=>({...p,status:e.target.value}))}>{SUPPLIER_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">Supplier *</label><input className="inp" value={form.supplier} onChange={(e)=>setForm(p=>({...p,supplier:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Email</label><input className="inp" type="email" value={form.contactEmail} onChange={(e)=>setForm(p=>({...p,contactEmail:e.target.value}))} /></div>
          </div>
          <div className="r2">
            <div className="fg"><label className="fl">Order Date</label><input className="inp" type="date" value={form.date} onChange={(e)=>setForm(p=>({...p,date:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Expected</label><input className="inp" type="date" value={form.expectedDate} onChange={(e)=>setForm(p=>({...p,expectedDate:e.target.value}))} /></div>
          </div>
          <div className="div"/>
          <div className="fl" style={{marginBottom:9}}>Items</div>
          <div style={{display:"flex",gap:8,marginBottom:11}}>
            <select className="sel" value={ss} onChange={(e)=>{setSs(e.target.value);const inv=inventory.find(i=>i.sku===e.target.value);setSp(inv?.costPrice||0);}} style={{flex:2}}>
              <option value="">— SKU —</option>{inventory.map(i=><option key={i.sku} value={i.sku}>{i.sku} — {i.name}</option>)}
            </select>
            <input className="inp" type="number" min="1" value={sq} onChange={(e)=>setSq(+e.target.value)} style={{width:60}} />
            <input className="inp" type="number" min="0" step="0.01" value={sp} onChange={(e)=>setSp(+e.target.value)} style={{width:75}} placeholder="$" />
            <button className="btn btn-g" onClick={addI} disabled={!ss}>Add</button>
          </div>
          {pis.length>0&&<div className="tw mb12"><table><thead><tr><th>SKU</th><th>Name</th><th>Qty</th><th>Unit</th><th>Total</th><th></th></tr></thead>
            <tbody>{pis.map(item=><tr key={item.sku}><td className="mono">{item.sku}</td><td>{item.name}</td><td className="mono">{item.qty}</td><td className="mono">${fmt(item.unitCost)}</td><td className="mono amber">${fmt(item.unitCost*item.qty)}</td><td><button className="btn btn-d btn-xs" onClick={()=>setPis(p=>p.filter(x=>x.sku!==item.sku))}>×</button></td></tr>)}
            <tr style={{background:"var(--s2)"}}><td colSpan={4} style={{textAlign:"right",fontWeight:700}}>Total</td><td className="mono fw6 amber">${fmt(tot(pis))}</td><td/></tr>
            </tbody></table></div>}
          <div className="fg"><label className="fl">Notes</label><textarea className="ta" value={form.notes} onChange={(e)=>setForm(p=>({...p,notes:e.target.value}))} /></div>
        </Modal>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// LOCATIONS
// ════════════════════════════════════════════════════════════════════════════
const Locations = ({locations,setLocations,inventory}) => {
  const [modal,setModal]=useState(null); const [form,setForm]=useState({name:"",zone:"",description:""});
  const its=(n)=>inventory.filter(i=>i.location===n);
  const save=()=>{
    if(!form.name.trim())return alert("Name required.");
    if(modal.mode==="add")setLocations(p=>[...p,{...form,id:genId()}]);
    else setLocations(p=>p.map(l=>l.id===form.id?{...form}:l));
    setModal(null);
  };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:17}}>
        <button className="btn btn-p" onClick={()=>{setForm({name:"",zone:"",description:""});setModal({mode:"add"})}}>+ Add Location</button>
      </div>
      {locations.length===0?<Empty icon="📍" title="No locations" sub="Add bins, shelves, or zones" action={<button className="btn btn-p" onClick={()=>{setForm({name:"",zone:"",description:""});setModal({mode:"add"})}}>+ Add</button>} />:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:13}}>
          {locations.map(loc=>{
            const ls=its(loc.name), qty=ls.reduce((s,i)=>s+i.quantity,0);
            return (
              <div className="card" key={loc.id} style={{padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:"var(--mono)",fontWeight:700,color:"var(--amber)",fontSize:14}}>{loc.name}</div>
                    {loc.zone&&<div className="sm muted">Zone: {loc.zone}</div>}
                  </div>
                  <div className="flex gap8">
                    <button className="btn btn-g btn-xs" onClick={()=>{setForm({...loc});setModal({mode:"edit"})}}>Edit</button>
                    <button className="btn btn-d btn-xs" onClick={()=>{if(confirm("Delete?"))setLocations(p=>p.filter(l=>l.id!==loc.id))}}>Del</button>
                  </div>
                </div>
                {loc.description&&<div className="sm muted mb12">{loc.description}</div>}
                <div style={{display:"flex",gap:16,marginBottom:ls.length>0?9:0}}>
                  <div><div className="sm muted">SKUs</div><div className="mono fw6">{ls.length}</div></div>
                  <div><div className="sm muted">Units</div><div className="mono fw6">{qty}</div></div>
                </div>
                {ls.slice(0,3).map(i=><div key={i.id} className="sm" style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:"1px solid var(--b1)"}}><span className="mono" style={{color:"var(--t2)"}}>{i.sku}</span><span className="mono">{i.quantity}</span></div>)}
                {ls.length>3&&<div className="sm muted mt4">+{ls.length-3} more</div>}
              </div>
            );
          })}
        </div>
      )}
      {modal&&<Modal title={modal.mode==="add"?"Add Location":"Edit Location"} onClose={()=>setModal(null)}
        footer={<><button className="btn btn-g" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-p" onClick={save}>Save</button></>}>
        <div className="r2">
          <div className="fg"><label className="fl">Name *</label><input className="inp" value={form.name} onChange={(e)=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. A-01-B" /></div>
          <div className="fg"><label className="fl">Zone</label><input className="inp" value={form.zone} onChange={(e)=>setForm(p=>({...p,zone:e.target.value}))} /></div>
        </div>
        <div className="fg"><label className="fl">Description</label><textarea className="ta" value={form.description} onChange={(e)=>setForm(p=>({...p,description:e.target.value}))} /></div>
      </Modal>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════════════════════
const Reports = ({inventory,orders}) => {
  const prods=inventory.filter(i=>!i.isPackaging), pkgs=inventory.filter(i=>i.isPackaging);
  const low=prods.filter(i=>i.quantity>0&&i.quantity<=i.reorderPoint), oos=prods.filter(i=>i.quantity===0);
  const costVal=prods.reduce((s,i)=>s+i.costPrice*i.quantity,0), sellVal=prods.reduce((s,i)=>s+i.sellPrice*i.quantity,0);
  const platBreak=PLATFORMS.map(p=>({p,count:orders.filter(o=>o.platform===p).length,val:orders.filter(o=>o.platform===p).reduce((s,o)=>s+o.total,0)})).filter(p=>p.count>0);
  return (
    <div>
      <div className="sg">
        {[{label:"Inventory Cost",value:`$${fmt(costVal)}`,sub:`${prods.length} product SKUs`,ac:"#f59e0b"},{label:"Inventory Sell Value",value:`$${fmt(sellVal)}`,sub:`$${fmt(sellVal-costVal)} potential margin`,ac:"#10b981"},{label:"Low / Out of Stock",value:`${low.length} / ${oos.length}`,sub:"require attention",ac:"#ef4444"},{label:"Packaging SKUs",value:pkgs.length,sub:"supply items",ac:"#8b5cf6"},{label:"Total Orders",value:orders.length,sub:`$${fmt(orders.reduce((s,o)=>s+o.total,0))} revenue`,ac:"#3b82f6"}]
          .map(s=><div className="sc" key={s.label} style={{"--ac":s.ac}}><div className="sl">{s.label}</div><div className="sv" style={{fontSize:String(s.value).length>8?18:23}}>{s.value}</div><div className="ss">{s.sub}</div></div>)}
      </div>
      <div className="g2">
        <div className="card">
          <div className="ch"><span className="ct">⚠ Stock Alerts</span><Badge label={low.length+oos.length} color="#ef4444" /></div>
          {low.length===0&&oos.length===0?<Empty icon="✅" title="All stocked!" sub="" />:(
            <table><thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Reorder</th><th>Status</th></tr></thead>
              <tbody>
                {oos.map(i=><tr key={i.id}><td className="mono amber">{i.sku}</td><td>{i.name}</td><td className="mono red">0</td><td className="mono">{i.reorderPoint}</td><td><Badge label="OUT" color="#ef4444" /></td></tr>)}
                {low.map(i=><tr key={i.id}><td className="mono amber">{i.sku}</td><td>{i.name}</td><td className="mono" style={{color:"#f59e0b"}}>{i.quantity}</td><td className="mono">{i.reorderPoint}</td><td><Badge label="LOW" color="#f59e0b" /></td></tr>)}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="ch"><span className="ct">Orders by Platform</span></div>
          {platBreak.length===0?<Empty icon="📊" title="No orders yet" sub="" />:(
            <table><thead><tr><th>Platform</th><th>Orders</th><th>Revenue</th></tr></thead>
              <tbody>{platBreak.map(p=><tr key={p.p}><td><span className="pp">{p.p}</span></td><td className="mono">{p.count}</td><td className="mono amber">${fmt(p.val)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const Dashboard = ({inventory,orders,fulfillments,locations}) => {
  const prods=inventory.filter(i=>!i.isPackaging);
  const low=prods.filter(i=>i.quantity<=LOW_STOCK&&i.quantity>0), oos=prods.filter(i=>i.quantity===0);
  const activeOrders=orders.filter(o=>!["Delivered","Cancelled"].includes(o.status));
  const activeFull=fulfillments.filter(f=>f.status!=="Fulfilled");
  const ready=fulfillments.filter(f=>f.status==="Ready to Ship"||f.status==="Label Assigned");
  const recent=[...orders].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
  return (
    <div>
      <div className="sg">
        {[{label:"Total SKUs",value:prods.length,sub:`${prods.reduce((s,i)=>s+i.quantity,0)} units in stock`,ac:"#f59e0b"},{label:"Active Orders",value:activeOrders.length,sub:`$${fmt(orders.reduce((s,o)=>s+o.total,0))} total`,ac:"#3b82f6"},{label:"In Fulfillment",value:activeFull.length,sub:`${ready.length} ready to ship`,ac:"#8b5cf6"},{label:"Stock Alerts",value:low.length+oos.length,sub:`${oos.length} out of stock`,ac:"#ef4444"},{label:"Locations",value:locations.length,sub:"warehouse zones",ac:"#10b981"}]
          .map(s=><div className="sc" key={s.label} style={{"--ac":s.ac}}><div className="sl">{s.label}</div><div className="sv">{s.value}</div><div className="ss">{s.sub}</div></div>)}
      </div>
      <div className="g2">
        <div className="card">
          <div className="ch"><span className="ct">Recent Orders</span></div>
          {recent.length===0?<Empty icon="🛒" title="No orders yet" sub="" />:(
            <table><thead><tr><th>Order ID</th><th>Platform</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>{recent.map(o=><tr key={o.id}><td><span className="mono fw6 amber">{o.orderId}</span></td><td><span className="pp">{o.platform}</span></td><td><Badge label={o.status} color={SC[o.status]} /></td><td className="mono amber">${fmt(o.total)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="ch"><span className="ct">Fulfillment Queue</span><Badge label={activeFull.length} color="#8b5cf6" /></div>
          {activeFull.length===0?<Empty icon="📬" title="Queue empty" sub="Send orders to fulfillment" />:(
            <div className="cb">
              {activeFull.slice(0,7).map(f=>(
                <div className="ai" key={f.id}>
                  <div className="adot" style={{background:SC[f.status]}} />
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,fontFamily:"var(--mono)",color:"var(--amber)"}}>{f.orderRef}</div>
                    <div className="sm muted">{f.customerName}</div>
                  </div>
                  <Badge label={f.status} color={SC[f.status]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT LOADER
// Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY with your real values
// from Supabase Dashboard → Project Settings → API
// ════════════════════════════════════════════════════════════════════════════
const SUPABASE_URL  = "https://fqswqxrstkppfuqxejaq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxc3dxeHJzdGtwcGZ1cXhlamFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODk4NDUsImV4cCI6MjA4ODc2NTg0NX0.bqxLwI7BZKAxB8oAYZwzevbn-gOKFrD31gZo8fe8vew";

const loadSupabase = () => new Promise((resolve) => {
  if (window.__supabase) return resolve(window.__supabase);
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  s.onload = () => {
    window.__supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    resolve(window.__supabase);
  };
  document.head.appendChild(s);
});

// ── DB helpers ───────────────────────────────────────────────────────────────
// Each table stores one JSON row per record using the item's id as primary key.
// Schema:  id TEXT PRIMARY KEY,  data JSONB,  updated_at TIMESTAMPTZ DEFAULT now()

const dbLoad = async (db, table) => {
  const { data, error } = await db.from(table).select("data").order("updated_at", { ascending: true });
  if (error) { console.error(`Load ${table}:`, error.message); return []; }
  return (data || []).map(r => r.data);
};

const dbUpsert = async (db, table, record) => {
  const { error } = await db.from(table).upsert({ id: record.id, data: record, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) console.error(`Upsert ${table}:`, error.message);
};

const dbDelete = async (db, table, id) => {
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) console.error(`Delete ${table}:`, error.message);
};

// ── Sync-aware setter factory ─────────────────────────────────────────────────
// Returns a wrapped setter that also persists every change to Supabase.
// oldArr + newArr diff → upsert changed/added records, delete removed ones.
const makeSyncedSetter = (db, table, setter) => (updater) => {
  setter(prev => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (!db) return next; // offline / not configured — just update state
    // Find added or changed records
    next.forEach(record => {
      const old = prev.find(p => p.id === record.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(record)) {
        dbUpsert(db, table, record);
      }
    });
    // Find deleted records
    prev.forEach(record => {
      if (!next.find(n => n.id === record.id)) dbDelete(db, table, record.id);
    });
    return next;
  });
};

// ════════════════════════════════════════════════════════════════════════════
// CONNECTION STATUS BANNER
// ════════════════════════════════════════════════════════════════════════════
const ConnBanner = ({ status }) => {
  const cfg = {
    loading:  { bg:"#1e2438", color:"#8a9bbf",  icon:"⟳", text:"Connecting to database…"          },
    ok:       { bg:"#052e16", color:"#10b981",   icon:"●", text:"Database connected — data is safe" },
    error:    { bg:"#2d0a0a", color:"#ef4444",   icon:"⚠", text:"Database offline — working locally (data may not save)" },
    notset:   { bg:"#1c1a07", color:"#f5a623",   icon:"⚙", text:"Supabase not configured — set your URL & key in App.jsx (Section 2 of guide)" },
  };
  const c = cfg[status] || cfg.notset;
  return (
    <div style={{ background: c.bg, borderBottom: "1px solid #252d45", padding: "6px 24px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: c.color, fontSize: 13, fontFamily: "var(--mono)" }}>{c.icon}</span>
      <span style={{ color: c.color, fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600 }}>{c.text}</span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP  — with Supabase sync
// ════════════════════════════════════════════════════════════════════════════
const NAV = [
  {id:"dashboard",  label:"Dashboard",       icon:"◈", sec:"Overview"},
  {id:"inventory",  label:"Inventory",        icon:"◻", sec:"Warehouse"},
  {id:"locations",  label:"Locations",        icon:"◎", sec:"Warehouse"},
  {id:"orders",     label:"Orders",           icon:"◇", sec:"Commerce"},
  {id:"suppliers",  label:"Purchase Orders",  icon:"◈", sec:"Commerce"},
  {id:"fulfillment",label:"Fulfillment",      icon:"◆", sec:"Operations"},
  {id:"reports",    label:"Reports & Alerts", icon:"◉", sec:"Analytics"},
];

export default function App() {
  injectFont(); injectCSS();

  // ── State ──────────────────────────────────────────────────────────────────
  const [page,         setPage]         = useState("dashboard");
  const [inventory,    setInventory]    = useState([]);
  const [orders,       setOrders]       = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);
  const [locations,    setLocations]    = useState([]);
  const [fulfillments, setFulfillments] = useState([]);
  const [db,           setDb]           = useState(null);
  const [dbStatus,     setDbStatus]     = useState("loading"); // loading | ok | error | notset

  // ── Boot: load Supabase + fetch all data ───────────────────────────────────
  useEffect(() => {
    if (SUPABASE_URL === "YOUR_SUPABASE_URL" || SUPABASE_ANON === "YOUR_SUPABASE_ANON_KEY") {
      setDbStatus("notset");
      return;
    }
    loadSupabase().then(async (client) => {
      try {
        setDbStatus("loading");
        const [inv, ord, sup, loc, ful] = await Promise.all([
          dbLoad(client, "inventory"),
          dbLoad(client, "orders"),
          dbLoad(client, "suppliers"),
          dbLoad(client, "locations"),
          dbLoad(client, "fulfillments"),
        ]);
        setInventory(inv);
        setOrders(ord);
        setSuppliers(sup);
        setLocations(loc);
        setFulfillments(ful);
        setDb(client);
        setDbStatus("ok");
      } catch (e) {
        console.error("Supabase boot error:", e);
        setDbStatus("error");
      }
    }).catch(() => setDbStatus("error"));
  }, []);

  // ── Synced setters — every change auto-saves to Supabase ──────────────────
  const syncInventory    = useMemo(() => db ? makeSyncedSetter(db, "inventory",    setInventory)    : setInventory,    [db]);
  const syncOrders       = useMemo(() => db ? makeSyncedSetter(db, "orders",       setOrders)       : setOrders,       [db]);
  const syncSuppliers    = useMemo(() => db ? makeSyncedSetter(db, "suppliers",    setSuppliers)    : setSuppliers,    [db]);
  const syncLocations    = useMemo(() => db ? makeSyncedSetter(db, "locations",    setLocations)    : setLocations,    [db]);
  const syncFulfillments = useMemo(() => db ? makeSyncedSetter(db, "fulfillments", setFulfillments) : setFulfillments, [db]);

  // ── Derived counts ─────────────────────────────────────────────────────────
  const lowCount   = inventory.filter(i => !i.isPackaging && i.quantity <= LOW_STOCK).length;
  const fillCount  = fulfillments.filter(f => f.status !== "Fulfilled").length;
  const readyCount = fulfillments.filter(f => f.status === "Ready to Ship" || f.status === "Label Assigned").length;

  const subs = {
    dashboard:   "Warehouse overview",
    inventory:   `${inventory.filter(i=>!i.isPackaging).length} products · ${inventory.filter(i=>i.isPackaging).length} packaging SKUs`,
    locations:   `${locations.length} locations`,
    orders:      `${orders.length} orders`,
    suppliers:   `${suppliers.length} purchase orders`,
    fulfillment: `${fillCount} active · ${readyCount} ready to ship`,
    reports:     "Stock health & analytics",
  };

  const secs = [...new Set(NAV.map(n => n.sec))];

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <div className="logo-inner">
            <div className="logo-bar" />
            <div className="logo-text">WAREHOUSE<span>Management System</span></div>
          </div>
        </div>
        {secs.map(sec => (
          <div key={sec}>
            <div className="nsec">{sec}</div>
            {NAV.filter(n => n.sec === sec).map(n => (
              <div key={n.id} className={`ni ${page===n.id?"on":""}`} onClick={() => setPage(n.id)}>
                <span className="ni-icon" style={{fontFamily:"serif"}}>{n.icon}</span>
                <span>{n.label}</span>
                {n.id==="inventory"    && lowCount>0   && <span className="nbadge red">{lowCount}</span>}
                {n.id==="fulfillment"  && fillCount>0  && <span className="nbadge amber">{fillCount}</span>}
                {n.id==="fulfillment"  && readyCount>0 && <span className="nbadge blue" style={{marginLeft:3}}>{readyCount}🚀</span>}
                {n.id==="reports"      && lowCount>0   && <span className="nbadge red">{lowCount}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="main">
        <ConnBanner status={dbStatus} />
        <div className="topbar">
          <div>
            <div className="pt">{NAV.find(n => n.id===page)?.label}</div>
            <div className="ps">{subs[page]}</div>
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t3)"}}>
            {new Date().toLocaleDateString("en-CA",{weekday:"short",year:"numeric",month:"short",day:"numeric"})}
          </div>
        </div>

        <div className="content">
          {page==="dashboard"   && <Dashboard   inventory={inventory}       orders={orders}          fulfillments={fulfillments} locations={locations} />}
          {page==="inventory"   && <Inventory   inventory={inventory}       setInventory={syncInventory}    locations={locations} />}
          {page==="locations"   && <Locations   locations={locations}       setLocations={syncLocations}    inventory={inventory} />}
          {page==="orders"      && <Orders      orders={orders}             setOrders={syncOrders}          inventory={inventory}  setFulfillments={syncFulfillments} />}
          {page==="suppliers"   && <Suppliers   suppliers={suppliers}       setSuppliers={syncSuppliers}    inventory={inventory} />}
          {page==="fulfillment" && <Fulfillment fulfillments={fulfillments} setFulfillments={syncFulfillments} inventory={inventory} setOrders={syncOrders} />}
          {page==="reports"     && <Reports     inventory={inventory}       orders={orders}          suppliers={suppliers} />}
        </div>
      </div>
    </div>
  );
}