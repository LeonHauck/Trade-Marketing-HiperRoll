using System;
using System.IO;
using System.Text;

public class TestRestore {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        // Multi-character anomalies from overlapping replacements
        content = content.Replace("Séó", "S");
        content = content.Replace("táé", "t");

        string[] bad2 = new string[] {
            "cá", "tá", "só", "sé", "né", "vá", "lá", "má", "há", "já",
            "Cá", "Tá", "Má", "Lá", "Há", "Já", "Só", "Sé"
        };
        
        string[] good2 = new string[] {
            "c", "t", "s", "s", "n", "v", "l", "m", "h", "j",
            "C", "T", "M", "L", "H", "J", "S", "S"
        };

        for (int i = 0; i < bad2.Length; i++) {
            content = content.Replace(bad2[i], good2[i]);
        }

        // Additional cleanup for words
        content = content.Replace("Nãoão", "Não");
        
        // Some words got double replaced, like "est" -> "está" then "t" -> "tá" -> "estáá"?
        // Since we already replaced tá -> t, "estáá" became "está". That's correct.

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}
