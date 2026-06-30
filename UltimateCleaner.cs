using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

public class UltimateCleaner {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        // Strip the specific garbage characters using unicode escapes to avoid any file encoding misinterpretation
        // 01DF: ǟ
        // 01ED: ǭ
        // 01F8: Ǹ
        // 01E6: Ǧ
        // 01DC: ǜ
        // 01FD: ǽ
        // FFFD: 
        string pattern = "[\u01DF\u01ED\u01F8\u01E6\u01DC\u01FD\uFFFD]";
        content = Regex.Replace(content, pattern, "");

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}
