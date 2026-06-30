using System;
using System.IO;
using System.Text;

public class MojibakeRestorer {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        // Strip the mojibake insertions!
        content = content.Replace("SÃ©Ã³", "S");
        content = content.Replace("tÃ¡Ã©", "t");
        content = content.Replace("cÃ¡", "c");
        content = content.Replace("tÃ¡", "t");
        content = content.Replace("sÃ³", "s");
        content = content.Replace("sÃ©", "s");
        content = content.Replace("nÃ©", "n");
        content = content.Replace("vÃ¡", "v");
        content = content.Replace("lÃ¡", "l");
        content = content.Replace("mÃ¡", "m");
        content = content.Replace("hÃ¡", "h");
        content = content.Replace("jÃ¡", "j");
        content = content.Replace("CÃ¡", "C");
        content = content.Replace("TÃ¡", "T");
        content = content.Replace("MÃ¡", "M");
        content = content.Replace("LÃ¡", "L");
        content = content.Replace("HÃ¡", "H");
        content = content.Replace("JÃ¡", "J");
        content = content.Replace("SÃ³", "S");
        content = content.Replace("SÃ©", "S");

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}
