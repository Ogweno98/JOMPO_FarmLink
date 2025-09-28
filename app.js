<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBQnDRbmUjgSNLhvl_0eDhOvaoR0zCpmyw",
    authDomain: "jompo-farmlink.firebaseapp.com",
    projectId: "jompo-farmlink",
    storageBucket: "jompo-farmlink.firebasestorage.app",
    messagingSenderId: "987751403891",
    appId: "1:987751403891:web:8923253cd75c095c07f506",
    measurementId: "G-DQCWTBSEDD"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const HARDCODED_ADMIN_EMAIL = "maxwelogweno098@gmail.com";
document.getElementById("login-form")?.addEventListener("submit", async e=>{ e.preventDefault(); const email=document.getElementById("login-email").value.trim(); const password=document.getElementById("login-password").value; try{ await auth.signInWithEmailAndPassword(email,password); window.location.href="index.html"; } catch(err){ alert(err.message); } });
document.getElementById("signup-form")?.addEventListener("submit", async e=>{ e.preventDefault(); const email=document.getElementById("signup-email").value.trim(); const password=document.getElementById("signup-password").value; try{ const uc = await auth.createUserWithEmailAndPassword(email,password); await db.collection('users').doc(uc.user.uid).set({email, createdAt: firebase.firestore.FieldValue.serverTimestamp(), blocked:false, role:'user'}); alert("Signup successful"); window.location.href="login.html"; } catch(err){ alert(err.message); } });
function logoutUser(){ auth.signOut().then(()=>window.location.href="login.html"); }
auth.onAuthStateChanged(async user=>{ if(!user)return; if(user.email.toLowerCase()===HARDCODED_ADMIN_EMAIL.toLowerCase())document.getElementById('admin-section').style.display='block'; else document.getElementById('admin-section').style.display='none'; const locSel=document.getElementById('product-location'); if(locSel){ locSel.innerHTML=''; const snap=await db.collection('locations').orderBy('name').get(); snap.forEach(doc=>{ const opt=document.createElement('option'); opt.value=doc.data().name; opt.textContent=doc.data().name; locSel.appendChild(opt); }); } const productList=document.getElementById('product-list'); if(productList){ const snap=await db.collection('products').orderBy('createdAt','desc').get(); productList.innerHTML=''; snap.forEach(doc=>{ const d=doc.data(); const card=document.createElement('div'); card.className='card'; card.innerHTML=`<h3>${d.name}</h3><p>KSH ${d.price}</p><p>${d.location}</p><img src="${d.imageUrl}" style="max-width:100%">`; productList.appendChild(card); }); } });
document.getElementById("product-form")?.addEventListener("submit", async e=>{ e.preventDefault(); const name=e.target["product-name"].value.trim(); const price=e.target["product-price"].value; const location=e.target["product-location"].value; const file=e.target["product-image"].files[0]; if(!name||!price||!location||!file)return alert("Fill all fields"); const user=auth.currentUser; if(!user)return alert("Login required"); const ref=storage.ref('product_images/'+Date.now()+"_"+file.name); const task=ref.put(file); task.on('state_changed', null, err=>alert(err.message), async()=>{ const url=await task.snapshot.ref.getDownloadURL(); await db.collection('products').add({name,price:Number(price),location,imageUrl:url,ownerId:user.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()}); alert("Product added"); e.target.reset(); }); });
document.getElementById("location-form")?.addEventListener("submit", async e=>{ e.preventDefault(); const name=document.getElementById("new-location").value.trim(); if(!name)return alert("Enter location name"); await db.collection("locations").add({name}); e.target.reset(); alert("Location added!"); });
