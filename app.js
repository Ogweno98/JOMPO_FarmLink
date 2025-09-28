<!-- Include this in your HTML (before app.js) -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
  import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
  import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
  import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBQnDRbmUjgSNLhvl_0eDhOvaoR0zCpmyw",
    authDomain: "jompo-farmlink.firebaseapp.com",
    projectId: "jompo-farmlink",
    storageBucket: "jompo-farmlink.firebasestorage.app",
    messagingSenderId: "987751403891",
    appId: "1:987751403891:web:8923253cd75c095c07f506",
    measurementId: "G-DQCWTBSEDD"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  // Hardcoded admin email
  const ADMIN_EMAIL = "maxwelogweno098@gmail.com";

  // Default locations
  const DEFAULT_LOCATIONS = ["Nairobi","Kisumu","Eldoret","Mombasa","Nakuru","Kericho","Kakamega","Machakos","Nyeri","Kisii"];

  let allProducts = [];
  let currentUserDoc = null;

  // ===== AUTH FUNCTIONS =====
  window.signup = async function() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (!email || !password) return alert("Enter email & password");
    try {
      const uc = await createUserWithEmailAndPassword(auth, email, password);
      // Create user doc
      await addDoc(collection(db, "users"), {
        uid: uc.user.uid,
        email,
        role: email.toLowerCase()===ADMIN_EMAIL.toLowerCase() ? "admin" : "user",
        blocked: false,
        createdAt: serverTimestamp()
      });
      alert("✅ Signup successful! Login now.");
    } catch(err) {
      alert("❌ Signup failed: " + err.message);
    }
  }

  window.login = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return alert("Enter email & password");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Login successful!");
    } catch(err) {
      alert("❌ Login failed: " + err.message);
    }
  }

  window.logout = function() {
    signOut(auth);
  }

  // ===== PRODUCTS & LOCATIONS =====
  async function seedLocationsIfEmpty() {
    const colRef = collection(db, "locations");
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      for (let loc of DEFAULT_LOCATIONS) {
        await addDoc(colRef, { name: loc });
      }
    }
  }

  window.loadLocations = async function() {
    const locSel = document.getElementById('productLocation');
    const filterSel = document.getElementById('locationFilter');
    locSel.innerHTML = '';
    filterSel.innerHTML = '<option value="">All Locations</option>';

    const snap = await getDocs(collection(db, "locations"));
    snap.forEach(doc => {
      const loc = doc.data().name;
      const opt1 = document.createElement('option');
      opt1.value = loc; opt1.textContent = loc; locSel.appendChild(opt1);
      const opt2 = document.createElement('option');
      opt2.value = loc; opt2.textContent = loc; filterSel.appendChild(opt2);
    });
  }

  window.addProduct = async function() {
    const name = document.getElementById('productName').value.trim();
    const price = Number(document.getElementById('productPrice').value);
    const location = document.getElementById('productLocation').value;
    const imageFile = document.getElementById('productImage').files[0];
    if (!name || !price || !location || !imageFile) return alert("Fill all fields & select image");

    if (!auth.currentUser) return alert("Please login");

    const storageRef = ref(storage, `product_images/${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "products"), {
      name, price, location, imageUrl: url,
      ownerId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    alert("✅ Product added");
    document.getElementById('productName').value='';
    document.getElementById('productPrice').value='';
    document.getElementById('productImage').value='';
  }

  // ===== LOAD PRODUCTS =====
  window.loadProducts = function() {
    const container = document.getElementById('productsList');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('locationFilter');

    const colRef = collection(db, "products");
    const q = query(colRef, orderBy("createdAt","desc"));

    onSnapshot(q, snapshot => {
      allProducts = [];
      container.innerHTML = '';
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        allProducts.push({ id: docSnap.id, ...data });
      });
      applyFilters();
    });

    window.applyFilters = function() {
      const search = searchInput.value.toLowerCase();
      const locFilter = filterSelect.value;
      container.innerHTML = '';
      const filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search);
        const matchesLoc = !locFilter || p.location===locFilter;
        return matchesSearch && matchesLoc;
      });
      if (filtered.length===0) container.innerHTML='<div>No products found</div>';
      else filtered.forEach(p=>{
        container.innerHTML += `
          <div class="card">
            <img src="${p.imageUrl}" alt="${p.name}">
            <h4>${p.name}</h4>
            <p>Price: KSH ${p.price}</p>
            <p>Location: ${p.location}</p>
          </div>`;
      });
    }
  }

  // ===== ADMIN =====
  function isAdmin(user) {
    return user?.email.toLowerCase()===ADMIN_EMAIL.toLowerCase();
  }

  window.adminAddLocation = async function() {
    const val = document.getElementById('adminNewLocation').value.trim();
    if(!val) return alert("Enter location");
    await addDoc(collection(db,'locations'),{name:val});
    document.getElementById('adminNewLocation').value='';
    await loadLocations();
    alert("✅ Location added");
  }

  // ===== AUTH STATE =====
  onAuthStateChanged(auth, async user=>{
    if(user){
      // load user's doc if exists
      const usersSnap = await getDocs(collection(db,'users'));
      currentUserDoc = usersSnap.docs.find(d=>d.data().uid===user.uid)?.data() || null;
      await seedLocationsIfEmpty();
      await loadLocations();
      loadProducts();
      if(isAdmin(user)) alert("Admin logged in!");
      showSection('market');
    } else {
      currentUserDoc=null;
      showSection('login');
    }
  });

  window.showSection = function(id){
    document.querySelectorAll('.page').forEach(p=>p.style.display='none');
    document.getElementById(id).style.display='block';
  }

</script>
