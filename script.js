const $=id=>document.getElementById(id);

const levelLimits={1:3,2:7,3:15,4:20,5:25};
const levelPercent={1:0.02,2:0.05,3:0.08,4:0.12,5:0.2};

let users=JSON.parse(localStorage.getItem("users"))||[];
let currentUser=JSON.parse(localStorage.getItem("currentUser"))||null;
let products=JSON.parse(localStorage.getItem("products"))||[];
let pendingDeposits=JSON.parse(localStorage.getItem("pendingDeposits"))||[];

if(products.length===0){
    products=[
        {name:"Smartphone",price:300,image:"https://via.placeholder.com/100",reviews:0},
        {name:"Headphones",price:80,image:"https://via.placeholder.com/100",reviews:0},
        {name:"Laptop",price:1200,image:"https://via.placeholder.com/100",reviews:0}
    ]; localStorage.setItem("products",JSON.stringify(products));
}

const authSection=$("auth-section"), dashboard=$("dashboard"), adminPanel=$("admin-panel"), depositPage=$("deposit-page");
const productList=$("product-list");
let isRegister=false;

// Toggle Login/Register
$("toggle-auth").addEventListener("click",()=>{
    isRegister=!isRegister;
    $("auth-title").textContent=isRegister?"Register":"Login";
    $("auth-btn").textContent=isRegister?"Register":"Login";
    $("toggle-auth").innerHTML=isRegister?'Already have an account? <span>Login</span>':'Don\'t have an account? <span>Register</span>';
});

// Login/Register
$("auth-btn").addEventListener("click",()=>{
    const username=$("username").value.trim();
    const password=$("password").value.trim();
    if(!username||!password) return alert("Please fill all fields!");

    if(username==="admin" && password==="admin123"){currentUser={username:"admin"}; showAdmin(); return;}

    if(isRegister){
        if(users.find(u=>u.username===username)) return alert("User exists!");
        users.push({username,password,deposit:0,earnings:0,level:1,reviewsDone:0});
        saveAll(); alert("Registered successfully!");
    } else {
        const user=users.find(u=>u.username===username && u.password===password);
        if(!user)return alert("Invalid credentials");
        currentUser=user;
        if(typeof currentUser.reviewsDone==="undefined") currentUser.reviewsDone=0;
        localStorage.setItem("currentUser",JSON.stringify(user));
        showDashboard();
    }
});

// Show Dashboard
function showDashboard(){
    authSection.classList.add("hidden"); adminPanel.classList.add("hidden"); depositPage.classList.add("hidden"); dashboard.classList.remove("hidden");
    $("user-name").textContent=currentUser.username; updateUserUI();
}

// Update User UI
function updateUserUI(){
    $("user-deposit").textContent=currentUser.deposit.toFixed(2);
    $("user-earnings").textContent=currentUser.earnings.toFixed(2);
    $("user-level").textContent=currentUser.level;
    renderProducts();
}

// Render Products
function renderProducts(){
    productList.innerHTML="";
    const limit=levelLimits[currentUser.level]||3;
    const remaining=limit-(currentUser.reviewsDone||0);
    if(remaining<=0){productList.innerHTML="<p>Completed all reviews for current level.</p>";return;}
    products.slice(0,remaining).forEach((p,i)=>{
        const div=document.createElement("div");
        div.className="product";
        div.innerHTML=`
            <img src="${p.image||'https://via.placeholder.com/100'}" width="100" height="100">
            <div class="product-info">
                <h4>${p.name}</h4>
                <p>Price: $${p.price!==undefined?p.price:0}</p>
                <p>Reviews: ${p.reviews}</p>
            </div>
            <button onclick="reviewProduct(${i})">Review</button>
        `;
        productList.appendChild(div);
    });
}

window.reviewProduct=i=>{
    const product=products[i];
    const profit=product.price*(levelPercent[currentUser.level]||0.02);
    currentUser.earnings+=profit;
    currentUser.reviewsDone=(currentUser.reviewsDone||0)+1;
    product.reviews=(product.reviews||0)+1;
    saveAll(); updateUserUI();
    alert(`You reviewed ${product.name}! Earned $${profit.toFixed(2)}`);
};

// Deposit Page
$("deposit-btn").onclick=()=>{
    dashboard.classList.add("hidden"); depositPage.classList.remove("hidden");
    const address=$("wallet-address").value;
    $("wallet-qr").innerHTML=""; new QRCode($("wallet-qr"),{text:address,width:150,height:150});
};

$("copy-wallet").onclick=()=>{
    navigator.clipboard.writeText($("wallet-address").value).then(()=>alert("Wallet address copied!"));
};

$("back-dashboard").onclick=()=>{
    depositPage.classList.add("hidden"); dashboard.classList.remove("hidden");
};

$("submit-deposit").onclick=()=>{
    const amount=parseFloat($("deposit-amount").value);
    const file=$("deposit-screenshot").files[0];
    if(!amount||isNaN(amount)) return alert("Enter valid amount");
    if(!file) return alert("Upload screenshot");
    const reader=new FileReader();
    reader.onload=function(e){
        const screenshot=e.target.result;
        pendingDeposits.push({username:currentUser.username,amount,screenshot,status:"pending"});
        saveAll();
        alert("Deposit submitted! Admin will review.");
        $("deposit-amount").value=""; $("deposit-screenshot").value="";
        depositPage.classList.add("hidden"); dashboard.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
};

// Logout
$("logout").onclick=()=>{currentUser=null; localStorage.removeItem("currentUser"); dashboard.classList.add("hidden"); adminPanel.classList.add("hidden"); depositPage.classList.add("hidden"); authSection.classList.remove("hidden");};

// Admin Panel
function showAdmin(){authSection.classList.add("hidden"); dashboard.classList.add("hidden"); depositPage.classList.add("hidden"); adminPanel.classList.remove("hidden"); renderAdmin();}

function renderAdmin(){
    $("user-table").innerHTML="";
    users.forEach(u=>{
        if(u.username==="admin") return;
        $("user-table").innerHTML+=`<tr>
        <td>${u.username}</td>
        <td><input type="number" id="deposit-${u.username}" value="${u.deposit.toFixed(2)}"></td>
        <td><input type="number" id="earnings-${u.username}" value="${u.earnings.toFixed(2)}"></td>
        <td>${u.level}</td>
        <td><button onclick="upgradeUser('${u.username}')">Upgrade</button></td>
        <td><button onclick="downgradeUser('${u.username}')">Downgrade</button></td>
        <td><button onclick="editBalance('${u.username}')">Save</button></td>
        </tr>`;
    });

    $("pending-deposits").innerHTML="";
    pendingDeposits.forEach((p,i)=>{
        const imgHTML=p.screenshot?`<img src="${p.screenshot}" width="80">`:"No screenshot";
        $("pending-deposits").innerHTML+=`<tr>
        <td>${p.username}</td>
        <td>$${p.amount.toFixed(2)}</td>
        <td>${imgHTML}</td>
        <td><button onclick="approveDeposit(${i})">Approve</button></td>
        </tr>`;
    });
}

window.approveDeposit=i=>{
    const dep=pendingDeposits[i];
    const user=users.find(u=>u.username===dep.username);
    user.deposit+=dep.amount; pendingDeposits.splice(i,1); saveAll(); renderAdmin(); alert(`Deposit approved for ${user.username}`);
};

window.upgradeUser=username=>{
    const user=users.find(u=>u.username===username);
    if(user.level<5){user.level++; user.reviewsDone=0; saveAll(); renderAdmin(); alert(`${username} upgraded to level ${user.level}`);}
    else alert(`${username} is already at max level`);
};

window.downgradeUser=username=>{
    const user=users.find(u=>u.username===username);
    if(user.level>1){user.level--; saveAll(); renderAdmin(); alert(`${username} downgraded to level ${user.level}`);}
    else alert(`${username} is already at Level 1`);
};

window.editBalance=username=>{
    const user=users.find(u=>u.username===username);
    const newDeposit=parseFloat($(`deposit-${username}`).value);
    const newEarnings=parseFloat($(`earnings-${username}`).value);
    if(isNaN(newDeposit)||isNaN(newEarnings)) return alert("Invalid values");
    user.deposit=newDeposit; user.earnings=newEarnings; saveAll(); renderAdmin(); alert(`${username}'s balances updated`);
};

// Add Product
$("add-product").onclick=()=>{
    const name=$("product-name").value.trim();
    const price=parseFloat($("product-price").value);
    const file=$("product-image").files[0];
    if(!name||isNaN(price)) return alert("Enter all fields correctly");
    if(!file) return alert("Please select an image");
    const reader=new FileReader();
    reader.onload=function(e){
        products.push({name,price,image:e.target.result,reviews:0});
        saveAll();
        $("product-name").value=""; $("product-price").value=""; $("product-image").value="";
        alert("Product added!"); renderAdmin();
    };
    reader.readAsDataURL(file);
};

$("close-admin").onclick=$("logout").onclick;

function saveAll(){
    localStorage.setItem("users",JSON.stringify(users));
    localStorage.setItem("products",JSON.stringify(products));
    localStorage.setItem("pendingDeposits",JSON.stringify(pendingDeposits));
    if(currentUser && currentUser.username!=="admin") localStorage.setItem("currentUser",JSON.stringify(currentUser));
}

if(currentUser) currentUser.username==="admin"? showAdmin(): showDashboard();
