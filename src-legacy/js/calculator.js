// ===== WEEE Calculator =====
function calcWeee() {
  const cats = parseInt(document.getElementById('weeeCats').value) || 1;
  const brands = parseInt(document.getElementById('weeeBrands').value) || 1;
  const year = document.getElementById('weeeYear').value;

  const baseFee = 129; // WEEE Return services per year
  const insolvencyBase = 149; // first category
  const extraCatFee = Math.max(0, cats - 1) * 99;
  const extraBrandFee = Math.max(0, brands - 1) * 79.95;

  // EAR fees
  const earBrandFee = brands * 9.50;
  const earGuarantee = 3.80;
  const earQuarterly = 32.80;
  const earAuthFee = year === 'first' ? 50.76 : 0;

  const total = baseFee + insolvencyBase + extraCatFee + extraBrandFee
    + earBrandFee + earGuarantee + earQuarterly + earAuthFee;

  // Update DOM
  document.getElementById('weeeExtraCats').style.display = extraCatFee > 0 ? '' : 'none';
  document.getElementById('weeeExtraCats').innerHTML = `<td>额外类别费用 (${cats - 1} × 99€)</td><td>${extraCatFee.toFixed(2)} €</td>`;
  document.getElementById('weeeExtraBrands').style.display = extraBrandFee > 0 ? '' : 'none';
  document.getElementById('weeeExtraBrands').innerHTML = `<td>额外品牌费用 (${brands - 1} × 79.95€)</td><td>${extraBrandFee.toFixed(2)} €</td>`;
  document.getElementById('weeeInsolvency').innerHTML = `<td>破产担保 (${cats}类别)</td><td>${insolvencyBase.toFixed(2)} €</td>`;
  document.getElementById('weeeEarBrand').textContent = `${earBrandFee.toFixed(2)} €`;
  document.getElementById('weeeAuthFee').style.display = year === 'first' ? '' : 'none';
  document.getElementById('weeeTotal').textContent = `${total.toFixed(2)} €`;
}

// ===== Battery Calculator =====
function calcBattery() {
  const brands = parseInt(document.getElementById('batBrands').value) || 1;
  const year = document.getElementById('batYear').value;

  const baseFee = 129;
  const takebackBase = 129;
  const extraBrandFee = Math.max(0, brands - 1) * 49;

  const earBrandFee = brands * 16.40;
  const earMembership = 48;
  const earQuarterly = 3.80;
  const earAuthFee = year === 'first' ? 50.76 : 0;

  const total = baseFee + takebackBase + extraBrandFee
    + earBrandFee + earMembership + earQuarterly + earAuthFee;

  document.getElementById('batExtraBrands').style.display = extraBrandFee > 0 ? '' : 'none';
  document.getElementById('batExtraBrands').innerHTML = `<td>额外品牌费用 (${brands - 1} × 49€)</td><td>${extraBrandFee.toFixed(2)} €</td>`;
  document.getElementById('batEarBrand').textContent = `${earBrandFee.toFixed(2)} €`;
  document.getElementById('batAuthFee').style.display = year === 'first' ? '' : 'none';
  document.getElementById('batTotal').textContent = `${total.toFixed(2)} €`;
}

// ===== Show/hide sections =====
function calcAll() {
  const weee = document.querySelector('#optWeee input').checked;
  const battery = document.querySelector('#optBattery input').checked;
  document.getElementById('weeeCalc').style.display = weee ? '' : 'none';
  document.getElementById('batteryCalc').style.display = battery ? '' : 'none';
}

// Initial calculation
calcWeee();
calcBattery();
