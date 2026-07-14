var fso = new ActiveXObject('Scripting.FileSystemObject');
var file = fso.OpenTextFile('app.js', 1, false, -1);
var src = file.ReadAll();
file.Close();
try {
  new Function(src);
  WScript.Echo('OK');
} catch (e) {
  WScript.Echo('ERROR: ' + e.message);
  WScript.Echo('Line: ' + e.number);
}
