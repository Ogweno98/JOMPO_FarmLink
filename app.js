<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, addDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

// Firebase Config
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const DEFAULT_LOCATIONS = ["Nairobi","Kisumu","Eldoret","Mombasa","Nakuru","Kericho","Kakamega","Machakos","Nyeri","Kisii"];
const HARDCODED_ADMIN_EMAIL = "maxwelogweno098@gmail.com";
let allProducts = [];
let currentUserDoc = null;

// Show section helper
function showSection(id){ document.querySelectorAll('.page').forEach(p=>p.style.display='none'); document.getElementById(id).style.display='block'; }

// Signup/Login
async function signup(){
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  if(!email||!password) return alert('Enter email & password');
  try{
    const uc = await createUserWithEmailAndPassword(auth,email,password);
    await setDoc(doc(db,'users',uc.user.uid),{
      email, createdAt:serverTimestamp(), blocked:false,
      role:(email.toLowerCase()===HARDCODED_ADMIN_EMAIL.toLowerCase())?'admin':'user'
    });
    alert('✅ Signup successful');
  } catch(err){ alert(err.message); }
}

async function login(){
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if(!email||!password) return alert('Enter email & password');
  try{ await signInWithEmailAndPassword(auth,email,password); } catch(err){ alert(err.message); }
}

function logout(){ signOut(auth); }

// Locations
async function seedLocationsIfEmpty(){
  const colRef = collection(db,'locations');
  const snap = await getDocs(query(colRef,limit(1)));
  if(snap.empty){ for(let loc of DEFAULT_LOCATIONS){ await addDoc(colRef,{name:loc}); } }
}

async function loadLocations(){
  const locSel = document.getElementById('productLocation');
  const filterSel = document.getElementById('locationFilter');
  locSel.innerHTML=''; filterSel.innerHTML='<option value="">All Locations</option>';
  const snap = await getDocs(collection(db,'locations'));
  snap.forEach(doc=>{
    const l = doc.data().name;
    const opt1 = document.createElement('option'); opt1.value=opt1.textContent=l; locSel.appendChild(opt1);
    const opt2 = document.createElement('option'); opt2.value=opt2.textContent=l; filterSel.appendChild(opt2);
  });
}

// Add Product
async function addProduct(){
  const name=document.getElementById('productName').value.trim();
  const price=document.getElementById('productPrice').value;
  const location=document.getElementById('productLocation').value;
  const imageFile=document.getElementById('productImage').files[0];
  if(!name||!price||!location||!imageFile) return alert('Fill all fields and select image');
  const user = auth.currentUser; if(!user) return alert('Login required');
  if(currentUserDoc && currentUserDoc.blocked) return alert('Your account is blocked.');

  const storageRef = ref(storage,'product_images/' + Date.now() + '_' + imageFile.name);
  const uploadTask = uploadBytesResumable(storageRef,imageFile);
  uploadTask.on('state_changed',null, err=>alert(err.message), async ()=>{
    const url = await getDownloadURL(uploadTask.snapshot.ref);
    await addDoc(collection(db,'products'),{name,price:Number(price),location,imageUrl:url,ownerId:user.uid,createdAt:serverTimestamp()});
    document.getElementById('productName').value=''; document.getElementById('productPrice').value=''; document.getElementById('productImage').value='';
    alert('✅ Product added!'); loadProducts();
  });
}

// Load & Filter Products
async function loadProducts(){
  const snap = await getDocs(collection(db,'products'));
  allProducts=[]; snap.forEach(doc=>allProducts.push({id:doc.id,...doc.data()}));
  applyFilters();
}

function applyFilters(){
  const searchQuery=document.getElementById('searchInput').value.toLowerCase();
  const locationFilter=document.getElementById('locationFilter').value;
  const container=document.getElementById('productsList'); container.innerHTML='';
  const filtered=allProducts.filter(p=>p.name.toLowerCase().includes(searchQuery) && (locationFilter===''||p.location===locationFilter));
  if(filtered.length===0){ container.innerHTML='<div class="no-products">No products found.</div>'; return; }
  filtered.forEach(p=>{
    const html=`<div class="product-card">
      <img src="${p.imageUrl}" alt="${p.name}">
      <div class="product-info">
        <h4>${p.name}</h4>
        <p class="small">Price: KSH ${p.price}</p>
        <p class="small">Location: ${p.location}</p>
      </div>
    </div>`;
    container.insertAdjacentHTML('beforeend',html);
  });
}

// Admin UI
function isCurrentUserAdmin(user){ return user && user.email.toLowerCase()===HARDCODED_ADMIN_EMAIL.toLowerCase(); }
function updateAdminUI(user){ document.getElementById('admin-dashboard')&&(document.getElementById('admin-dashboard').style.display=isCurrentUserAdmin(user)?'block':'none'); }

// Auth state
onAuthStateChanged(auth,async user=>{
  if(user){
    const docs = await getDocs(collection(db,'users'));
    currentUserDoc = docs.docs.find(d=>d.id===user.uid)?.data()||null;
    await seedLocationsIfEmpty(); await loadLocations(); showSection('market-page'); loadProducts(); updateAdminUI(user);
  } else { currentUserDoc=null; showSection('login-page'); }
});

// Expose functions
window.signup=signup; window.login=login; window.logout=logout; window.addProduct=addProduct; window.applyFilters=applyFilters; window.showSection=showSection; window.adminAddLocation=async()=>{
  const val=document.getElementById('adminNewLocation').value.trim(); if(!val) return alert('Enter location'); await addDoc(collection(db,'locations'),{name:val}); document.getElementById('adminNewLocation').value=''; await loadLocations(); alert('✅ Location added'); };
</script>
