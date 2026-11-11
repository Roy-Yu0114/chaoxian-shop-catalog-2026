/* 潮鮮蔬店：商品目錄／月份菜單／本機採購需求清單。
   Public static application: no remote authentication, checkout, or shared order write. */
(function(){
"use strict";
const data=window.CHAOXIAN_PUBLIC_CATALOG;
if(!data||!Array.isArray(data.products)||!Array.isArray(data.menus)){
 document.body.insertAdjacentHTML("afterbegin",'<p role="alert">商品目錄暫時無法載入，請稍後重新整理。</p>');
 return;
}
const $=id=>document.getElementById(id);
const fmt=new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",minimumFractionDigits:0,maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const key="chaoxian_public_catalog_v101_requisition";
const productBySku=new Map(data.products.map(p=>[p.sku,p]));
const state={view:"products",category:"all",query:"",sort:"sku",page:1,month:"2026-11",selectedDate:"2026-11-11",cart:{}};
try{
 const saved=JSON.parse(localStorage.getItem(key)||"{}");
 if(saved&&typeof saved==="object"&&!Array.isArray(saved)){
  for(const [sku,quantity] of Object.entries(saved)){
   if(productBySku.has(sku)&&productBySku.get(sku).salePrice!=null
    &&Number.isFinite(Number(quantity))&&Number(quantity)>0){
    state.cart[sku]=Number(quantity);
   }
  }
 }
}catch(_){}
function notify(message){
 const node=$("notice");node.textContent=String(message);node.hidden=false;
 clearTimeout(notify.timer);notify.timer=setTimeout(()=>node.hidden=true,4500);
}
function cartSize(){
 return Object.keys(state.cart).filter(sku=>state.cart[sku]>0&&productBySku.has(sku)).length;
}
function saveCart(){
 try{localStorage.setItem(key,JSON.stringify(state.cart))}
 catch(_){notify("瀏覽器的儲存權限已停用，重新整理後需求清單可能無法保留。")}
 $("cart-count").textContent=String(cartSize());
 $("mobile-cart-count").textContent=String(cartSize());
}
function toView(view){
 if(!["products","menus","basket"].includes(view))return;
 state.view=view;
 for(const key of ["products","menus","basket"]){
  $(key+"-view").classList.toggle("is-open",key===view);
 }
 document.querySelectorAll("[data-view]").forEach(el=>{
  el.classList.toggle("active",el.dataset.view===view);
  if(el.dataset.view===view)el.setAttribute("aria-current","page");
  else el.removeAttribute("aria-current");
 });
 if(view==="basket")renderBasket();
 if(view==="menus")renderMenu();
 window.scrollTo({top:0,behavior:"instant"});
}
function renderCategories(){
 const html=['<button type="button" class="shop-filter-chip is-active" data-category="all">全部商品</button>'];
 for(const c of data.categories){
  html.push('<button type="button" class="shop-filter-chip" data-category="'+esc(c.id)+'">'+
   esc(c.icon)+" "+esc(c.name)+"</button>");
 }
 $("category-bar").innerHTML=html.join("");
}
function selectedProducts(){
 let rows=data.products.filter(p=>
  (state.category==="all"||p.category===state.category)&&
  (!state.query||(p.name+" "+p.sku+" "+p.spec+" "+p.categoryLabel).toLowerCase().includes(state.query))
 );
 const field=state.sort;
 rows=rows.slice().sort((a,b)=>{
  if(field==="priceAsc"||field==="priceDesc"){
   const x=a.salePrice==null?Infinity:Number(a.salePrice);
   const y=b.salePrice==null?Infinity:Number(b.salePrice);
   return (field==="priceAsc"?x-y:y-x)||a.sku.localeCompare(b.sku);
  }
  if(field==="name")return a.name.localeCompare(b.name,"zh-Hant")||a.sku.localeCompare(b.sku);
  return a.sku.localeCompare(b.sku);
 });
 return rows;
}
function renderProducts(){
 const items=selectedProducts();
 const pageSize=20,maxPage=Math.max(1,Math.ceil(items.length/pageSize));
 state.page=Math.min(Math.max(state.page,1),maxPage);
 const rows=items.slice((state.page-1)*pageSize,state.page*pageSize);
 $("product-count").textContent="顯示 "+items.length+"／"+data.products.length+" 項商品 · "+
  data.categories.length+" 個分類";
 const dateString=new Date(data.priceComputedAt).toLocaleString("zh-TW",{timeZone:"Asia/Taipei",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
 $("price-update").textContent="最新價目更新："+dateString+"（依有效進貨成本加25%）";
 $("product-list").innerHTML=rows.map(p=>{
  const photo=p.photo?
   '<img class="public-item-image" loading="lazy" src="'+esc(p.photo)+'" alt="'+esc(p.name)+'">':
   '<div class="public-item-image public-item-image-fallback" role="img" aria-label="'+esc(p.categoryLabel)+'">'+esc(p.icon)+"</div>";
  const price=p.salePrice==null?
   '<div class="public-product-price is-unavailable">請洽專員確認價格</div>':
   '<div class="public-product-price">'+fmt.format(p.salePrice)+' <small>／'+esc(p.unit)+"</small></div>";
  return '<article class="card" data-sku="'+esc(p.sku)+'">'+photo+
   '<span class="public-item-category">'+esc(p.categoryLabel)+' · '+esc(p.sku)+'</span>'+
   '<h3>'+esc(p.name)+'</h3><div class="public-product-meta">'+esc(p.spec||"")+'</div>'+
   price+'<button class="public-add" data-add="'+esc(p.sku)+'" type="button"'+
   (p.salePrice==null?" disabled":"")+">"+(p.salePrice==null?"暫不提供線上報價":"加入採購需求")+"</button></article>";
 }).join("")||'<p>目前沒有符合條件的商品，請調整篩選。</p>';
 const buttons=[];
 buttons.push('<button class="page-btn" data-page="'+(state.page-1)+'"'+(state.page===1?" disabled":"")+' type="button">上一頁</button>');
 for(let n=Math.max(1,state.page-2);n<=Math.min(maxPage,state.page+2);n++){
  buttons.push('<button class="page-btn'+(n===state.page?" active":"")+'" data-page="'+n+'" type="button">'+n+"</button>");
 }
 buttons.push('<button class="page-btn" data-page="'+(state.page+1)+'"'+(state.page===maxPage?" disabled":"")+' type="button">下一頁</button>');
 buttons.push('<span class="page-summary">'+state.page+"／"+maxPage+" 頁</span>");
 $("pagination").innerHTML=buttons.join("");
}
function add(sku){
 const p=productBySku.get(sku);
 if(!p||p.salePrice==null)return;
 const unit=String(p.unit);
 const step=(unit==="公斤"||unit==="公克"||unit==="斤"||unit==="台斤"||unit==="公升")?0.5:1;
 state.cart[sku]=Math.round(((state.cart[sku]||0)+step)*100)/100;
 saveCart();notify(p.name+" 已加入採購需求清單。");
}
function updateQuantity(sku,quantity){
 const p=productBySku.get(sku);
 if(!p)return;
 const n=Number(quantity);
 if(!Number.isFinite(n)||n<=0){delete state.cart[sku]}
 else if(n>100000){notify("數量超出範圍，請重新輸入。");return}
 else if(!["公斤","公克","斤","台斤","公升"].includes(p.unit)&&!Number.isInteger(n)){
  notify("此商品以整個販售單位計算，數量須為整數。");return;
 }else state.cart[sku]=Math.round(n*100)/100;
 saveCart();renderBasket();
}
function cartRows(){
 return Object.entries(state.cart).map(([sku,qty])=>({p:productBySku.get(sku),qty}))
  .filter(x=>x.p&&x.qty>0&&x.p.salePrice!=null)
  .sort((a,b)=>a.p.sku.localeCompare(b.p.sku));
}
function renderBasket(){
 const rows=cartRows();
 $("basket-list").innerHTML=rows.length?rows.map(({p,qty})=>
  '<div class="public-basket-line" data-sku="'+esc(p.sku)+'">'+
  '<div><strong>'+esc(p.name)+'</strong><small>'+esc(p.sku)+" · "+esc(p.spec||"")+'</small></div>'+
  '<div><input data-qty="'+esc(p.sku)+'" type="number" min="0" max="100000" step="'+
  (["公斤","公克","斤","台斤","公升"].includes(p.unit)?"0.5":"1")+'" value="'+qty+'" aria-label="'+esc(p.name)+'的數量"></div>'+
  '<span>'+fmt.format(qty*p.salePrice)+'</span>'+
  '<span class="public-line-unit">'+esc(p.unit)+'</span>'+
  '<button type="button" class="page-btn" data-remove="'+esc(p.sku)+'">移除</button></div>'
 ).join(""):'<p class="public-muted">需求清單目前沒有商品。可回到商品選購頁加入所需食材。</p>';
 $("basket-total").textContent=fmt.format(rows.reduce((sum,x)=>sum+x.qty*x.p.salePrice,0));
 $("copy-basket").disabled=!rows.length;
 $("download-basket").disabled=!rows.length;
}
function requestText(){
 const rows=cartRows();
 const lines=["潮鮮蔬店｜採購需求清單","整理日期："+new Date().toLocaleString("zh-TW",{timeZone:"Asia/Taipei"}),
 "本清單供與業務窗口確認；未直接建立正式訂單。",""];
 rows.forEach(({p,qty})=>lines.push(p.sku+"　"+p.name+"　"+qty+" "+p.unit+"　"+
  fmt.format(p.salePrice)+"／"+p.unit+"　小計"+fmt.format(p.salePrice*qty)));
 lines.push("","預計總金額："+fmt.format(rows.reduce((sum,x)=>sum+x.qty*x.p.salePrice,0)));
 return lines.join("\n");
}
function csvCell(value){
 const s=String(value??"");
 const safe=/^[=+\-@\t\r]/.test(s)?"'"+s:s;
 return '"'+safe.replaceAll('"','""')+'"';
}
function downloadCsv(fileName,head,rows){
 const csv="\uFEFF"+[head].concat(rows).map(line=>line.map(csvCell).join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement("a");anchor.href=url;anchor.download=fileName;
 document.body.append(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function downloadBasket(){
 const rows=cartRows();
 if(!rows.length)return;
 downloadCsv("潮鮮蔬店_採購需求_"+new Date().toISOString().slice(0,10)+".csv",
  ["性質","SKU","商品名稱","規格","數量","單位","單價","小計"],
  rows.map(({p,qty})=>["待專員確認的採購需求",p.sku,p.name,p.spec,qty,p.unit,p.salePrice,
   Math.round(p.salePrice*qty*100)/100]));
 notify("已下載採購需求清單，請提供給您的業務聯絡窗口確認。");
}
async function copyBasket(){
 const text=requestText();
 try{
  if(navigator.clipboard&&navigator.clipboard.writeText){
   await navigator.clipboard.writeText(text);
  }else{
   const textarea=document.createElement("textarea");textarea.value=text;textarea.style.position="fixed";
   textarea.style.opacity="0";document.body.append(textarea);textarea.select();
   document.execCommand("copy");textarea.remove();
  }
  notify("採購需求文字已複製，可傳送給業務窗口確認。");
 }catch(_){notify("無法複製，請改用下載CSV。")}
}
const menuByDate=new Map();
for(const row of data.menus){
 if(!menuByDate.has(row.date))menuByDate.set(row.date,[]);
 menuByDate.get(row.date).push(row);
}
function setMonth(month){
 if(!/^\d{4}-\d{2}$/.test(month)||month<"2026-01"||month>"2026-12")return;
 state.month=month;$("menu-month").value=month;
 const entries=Array.from(menuByDate.keys()).filter(k=>k.startsWith(month));
 state.selectedDate=entries.find(k=>k>=("2026-11-11")&&month==="2026-11")||entries[0]||month+"-01";
 renderMenu();
}
function shiftMonth(offset){
 const [year,month]=state.month.split("-").map(Number);
 const newDate=new Date(year,month-1+offset,1);
 const y=newDate.getFullYear(),m=String(newDate.getMonth()+1).padStart(2,"0");
 setMonth(y+"-"+m);
}
function renderMenu(){
 const [year,month]=state.month.split("-").map(Number);
 const first=new Date(year,month-1,1),offset=first.getDay();
 const daysInMonth=new Date(year,month,0).getDate();
 const week=["日","一","二","三","四","五","六"];
 const calendar=week.map(d=>'<div class="weekday">週'+d+"</div>");
 for(let n=0;n<offset;n++)calendar.push('<span class="day blank"></span>');
 for(let d=1;d<=daysInMonth;d++){
  const date=year+"-"+String(month).padStart(2,"0")+"-"+String(d).padStart(2,"0");
  const dayOfWeek=new Date(year,month-1,d).getDay();
  const meals=menuByDate.get(date)||[];
  const closed=dayOfWeek===0||meals.length===0;
  const active=date===state.selectedDate;
  calendar.push('<button type="button" class="day'+(closed?" closed":"")+
   (active?" active":"")+'" data-day="'+date+'"'+(closed?" disabled":"")+
   ' aria-label="'+date+(closed?"無標準供餐菜單":"查詢菜單")+'">'+
   "<span>"+d+"</span><small>"+(dayOfWeek===0?"星期日":meals.length?
    esc(meals[0].main):"無菜單")+"</small></button>");
 }
 $("menu-calendar").innerHTML=calendar.join("");
 const meals=menuByDate.get(state.selectedDate)||[];
 const mealParts=[
  ["主菜","main"],["副菜","side"],["淺色蔬菜","lightVeg"],
  ["深色蔬菜","darkVeg"],["根莖瓜果","rootVeg"],["湯品","soup"]
 ];
 $("menu-detail").innerHTML='<h3>'+esc(state.selectedDate)+"　每日菜單</h3>"+
  (meals.length?meals.map(x=>
   '<div class="public-menu-meal"><strong>'+esc(x.mealLabel)+'</strong>'+
   '<div class="public-menu-dishes">'+mealParts.filter(m=>x[m[1]]).map(m=>
    '<div><small>'+esc(m[0])+'</small>'+esc(x[m[1]])+"</div>").join("")+"</div></div>"
  ).join(""):'<p class="public-muted">本日沒有標準供餐菜單。</p>');
 $("prev-month").disabled=state.month<="2026-01";
 $("next-month").disabled=state.month>="2026-12";
}
function downloadMenu(){
 const monthly=data.menus.filter(x=>x.date.startsWith(state.month));
 downloadCsv("潮鮮蔬店_每日菜單_"+state.month+".csv",
  ["供餐日期","餐次","主菜","副菜","淺色蔬菜","深色蔬菜","根莖瓜果","湯品"],
  monthly.map(x=>[x.date,x.mealLabel,x.main,x.side,x.lightVeg,x.darkVeg,x.rootVeg,x.soup]));
 notify("已下載"+state.month+"月份供餐菜單。");
}
function bind(){
 document.querySelectorAll("[data-view]").forEach(el=>el.addEventListener("click",()=>toView(el.dataset.view)));
 $("category-bar").addEventListener("click",event=>{
  const el=event.target.closest("[data-category]");
  if(!el)return;
  state.category=el.dataset.category;state.page=1;
  document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("is-active",x===el));
  renderProducts();
 });
 $("searchInput").addEventListener("input",e=>{state.query=e.target.value.trim().toLowerCase();state.page=1;renderProducts()});
 $("sortSelect").addEventListener("change",e=>{state.sort=e.target.value;state.page=1;renderProducts()});
 $("product-list").addEventListener("click",event=>{
  const el=event.target.closest("[data-add]");if(el)add(el.dataset.add);
 });
 $("pagination").addEventListener("click",event=>{
  const el=event.target.closest("[data-page]");if(!el||el.disabled)return;
  state.page=Number(el.dataset.page);renderProducts();
  $("products-title").scrollIntoView({block:"start"});
 });
 $("basket-list").addEventListener("change",event=>{
  const el=event.target.closest("[data-qty]");if(el)updateQuantity(el.dataset.qty,el.value);
 });
 $("basket-list").addEventListener("click",event=>{
  const el=event.target.closest("[data-remove]");
  if(el){delete state.cart[el.dataset.remove];saveCart();renderBasket();}
 });
 $("clear-basket").addEventListener("click",()=>{
  if(!Object.keys(state.cart).length)return;
  if(window.confirm("確定清空此瀏覽器保存的採購需求？")){
   state.cart={};saveCart();renderBasket();
  }
 });
 $("copy-basket").addEventListener("click",copyBasket);
 $("download-basket").addEventListener("click",downloadBasket);
 $("menu-month").addEventListener("change",e=>setMonth(e.target.value));
 $("prev-month").addEventListener("click",()=>shiftMonth(-1));
 $("next-month").addEventListener("click",()=>shiftMonth(1));
 $("download-menu").addEventListener("click",downloadMenu);
 $("menu-calendar").addEventListener("click",event=>{
  const el=event.target.closest("[data-day]");
  if(!el||el.disabled)return;
  state.selectedDate=el.dataset.day;renderMenu();
 });
}
renderCategories();renderProducts();saveCart();
$("menu-month").value=state.month;
bind();renderMenu();
toView(["products","menus","basket"].includes(location.hash.slice(1))?location.hash.slice(1):"products");
window.CHAOXIAN_PUBLIC_CATALOG_INFO={
 getProducts:()=>data.products.length,
 getPricedProducts:()=>data.products.filter(x=>x.salePrice!=null).length,
 getMenus:()=>data.menus.length,
 getCart:()=>({...state.cart}),getView:()=>state.view
};
})();
