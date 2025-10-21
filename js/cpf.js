
// CPF utilities: mask, clean, validate
function cleanCPF(v){ return (v||'').replace(/\D/g,''); }
function maskCPF(value){
  return cleanCPF(value)
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}
function validateCPF(cpf){
  cpf = cleanCPF(cpf);
  if(!/^\d{11}$/.test(cpf)) return false;
  if(/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for(let i=0; i<9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  let d1 = 11 - (sum % 11); d1 = (d1 >= 10) ? 0 : d1;
  sum = 0;
  for(let i=0; i<10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  let d2 = 11 - (sum % 11); d2 = (d2 >= 10) ? 0 : d2;
  return (parseInt(cpf.charAt(9)) === d1) && (parseInt(cpf.charAt(10)) === d2);
}
document.addEventListener('input', (e)=>{
  if(e.target.matches('.cpf-input')) e.target.value = maskCPF(e.target.value);
});
window.CPFUtils = { cleanCPF, maskCPF, validateCPF };
