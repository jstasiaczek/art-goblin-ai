(() => {
  const rows = document.querySelectorAll("#pricing-images tr.mantine-Table-tr");

  const models = {};

  rows.forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 5) return;
    const name = tds[0]?.innerText.trim();
    const id = tds[1]?.innerText.trim();
    const sizeText = tds[2]?.innerText.split("\n")[0].trim();
    const price = tds[3]?.innerText.trim();
    const maxImages = tds[4]?.innerText.trim();
    let width = null;
    let height = null;

    if (sizeText.indexOf("x") !== -1) {
      [width, height] = sizeText.split("x").map(v => parseInt(v.trim(), 10));
    } else if (sizeText.indexOf("*") !== -1) {
      [width, height] = sizeText.split("*").map(v => parseInt(v.trim(), 10));
    } else {
      return;
    }


    if (!models[id]) {
      models[id] = {
        name,
        id,
        sizes: []
      };
    }

    models[id].sizes.push({ width, height, price, maxImages });
  });

  const file = new File([JSON.stringify(Object.values(models))], 'models.json', {
    type: 'appliaction/json',
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(file);

  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
})();