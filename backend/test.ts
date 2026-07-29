import * as jwt from 'jsonwebtoken';

const payload = { 
  sub: "13067b30-4799-4e83-bc72-1781638e9c5b", 
  email: "saurabhkumarchpbih@gmail.com", 
  role: "OWNER", 
  tenantId: "c11b88ed-c8c1-434b-83aa-f1601bf0c5ee" 
};

const token = jwt.sign(payload, "hotelops-jwt-secret-change-in-prod-2026");

async function main() {
  const res = await fetch("http://80.225.223.71/api/staff/13067b30-4799-4e83-bc72-1781638e9c5b", {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Saurabh Owner Updated 2",
      role: "OWNER"
    })
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", data);
}
main();
