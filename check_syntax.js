var fs = new ActiveXObject("Scripting.FileSystemObject");
var file = fs.OpenTextFile("app.js", 1);
var code = file.ReadAll();
file.Close();
try {
    eval("function check() { " + code + "\n }");
    WScript.Echo("Syntax OK");
} catch(e) {
    WScript.Echo("Syntax Error: " + e.description);
}
