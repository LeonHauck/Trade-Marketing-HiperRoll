using System;
using System.IO;
using System.Text;

public class HexDumper {
    public static void Dump() {
        string file = @"C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js";
        byte[] bytes = File.ReadAllBytes(file);
        
        int length = Math.Min(bytes.Length, 200);
        for(int i=0; i<length; i++) {
            Console.Write(bytes[i].ToString("X2") + " ");
        }
        Console.WriteLine();
        
        string text = Encoding.UTF8.GetString(bytes, 0, length);
        foreach(char c in text) {
            Console.Write($"{(int)c:X4} ");
        }
        Console.WriteLine();
    }
}
