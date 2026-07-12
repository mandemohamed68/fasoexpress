try {
  let s = "{ type: 'service_account' }";
  JSON.parse(s);
} catch(e) {
  console.log(e.message);
}
