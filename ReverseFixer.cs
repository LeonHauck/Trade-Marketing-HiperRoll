using System;
using System.IO;
using System.Text;

public class ReverseFixer {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        // We will perform replacements in a carefully chosen order.
        // Longer strings first!
        
        string[] bad = new string[] {
            "SÇ¸", "sÇ¸", "CÇ­", "cÇ­", "LÇ­", "lÇ­", "NÇ¸", "nÇ¸", 
            "TÇ­Ç¸", "tÇ­Ç¸", "TÇ­", "tÇ­", "MÇ­", "mÇ­", "HÇ­", "hÇ­", 
            "VÇ­", "vÇ­", "JÇ­", "jÇ­", "Ç­", "Ç¸"
        };
        
        string[] good = new string[] {
            "S", "s", "C", "c", "L", "l", "N", "n",
            "t", "t", "T", "t", "M", "m", "H", "h",
            "V", "v", "J", "j", "a", "e" // Guessing 'Ç­' left over might be 'a' or just remove it? Wait, Ç­ is from 'Ã¡', which was replaced. But let's be careful with Ç­ and Ç¸.
        };

        // Let's NOT do Ç­ and Ç¸ yet. Let's stick to the exact compound strings.
        string[] bad2 = new string[] {
            "SÇ¸", "sÇ¸", "CÇ­", "cÇ­", "LÇ­", "lÇ­", "NÇ¸", "nÇ¸", 
            "TÇ­Ç¸", "tÇ­Ç¸", "TÇ­", "tÇ­", "MÇ­", "mÇ­", "HÇ­", "hÇ­", 
            "VÇ­", "vÇ­", "JÇ­", "jÇ­"
        };
        
        string[] good2 = new string[] {
            "S", "s", "C", "c", "L", "l", "N", "n",
            "T", "t", "T", "t", "M", "m", "H", "h",
            "V", "v", "J", "j"
        };

        for (int i = 0; i < bad2.Length; i++) {
            content = content.Replace(bad2[i], good2[i]);
        }

        // Now fix known broken words that were in the dictionary
        // like NÇœo -> NÃ£o
        string[] badWords = new string[] {
            "NÇœo", "hÇ­", "histrico", "Observaes", "Relatrio", "ResponsÇ­vel",
            "INTELIGSNCIA", "Incio", "atÇ¸", "ComposiÇœo", "relatrio", "sltima",
            "Crtico", "notificaÇœo", "Opî¶¨î¶¨o", "segurana", "EDIî¶¨AO",
            "editÇ­veis", "mantÇ¸m", "ediÇœo", "tambÇ¸m", "memria", "sessÇœo",
            "validaÇœo", "aps", "espao", "relatÇ¸rio", "demonstraÇœo", "botÇœo",
            "reincidÇ¦ncias", "Ç§ltima", "HÇ­", "estatsticas", "padrÇœo", "ttulo",
            "Alteraes", "VocÇ¦", "estÇ­", "substituirÇœo", "inconsistÇ¦ncia",
            "PrÇ¸-preenche", "assncrono", "crtico", "resoluÇœo", "EvoluÇœo",
            "Verificao", "rpida", "esto", "nÇœo", "no", "est", "Voc",
            "Resoluo", "atualizao", "Atraso", "Atraso"
        };
        
        string[] goodWords = new string[] {
            "NÃ£o", "hÃ¡", "histÃ³rico", "ObservaÃ§Ãµes", "RelatÃ³rio", "ResponsÃ¡vel",
            "INTELIGÃŠNCIA", "InÃ­cio", "atÃ©", "ComposiÃ§Ã£o", "relatÃ³rio", "Ãšltima",
            "CrÃ­tico", "notificaÃ§Ã£o", "OpÃ§Ã£o", "seguranÃ§a", "EDIÃ‡ÃƒO",
            "editÃ¡veis", "mantÃ©m", "ediÃ§Ã£o", "tambÃ©m", "memÃ³ria", "sessÃ£o",
            "validaÃ§Ã£o", "apÃ³s", "espaÃ§o", "relatÃ³rio", "demonstraÃ§Ã£o", "botÃ£o",
            "reincidÃªncias", "Ãºltima", "HÃ¡", "estatÃ­sticas", "padrÃ£o", "tÃ­tulo",
            "AlteraÃ§Ãµes", "VocÃª", "estÃ¡", "substituirÃ£o", "inconsistÃªncia",
            "PrÃ©-preenche", "assÃ­ncrono", "crÃ­tico", "resoluÃ§Ã£o", "EvoluÃ§Ã£o",
            "VerificaÃ§Ã£o", "rÃ¡pida", "estÃ£o", "nÃ£o", "nÃ£o", "estÃ¡", "VocÃª",
            "ResoluÃ§Ã£o", "atualizaÃ§Ã£o", "Atraso", "Atraso"
        };
        
        for (int i = 0; i < badWords.Length; i++) {
            content = content.Replace(badWords[i], goodWords[i]);
        }
        
        // Let's do some more cleanup
        content = content.Replace("Ç­", "Ã¡");
        content = content.Replace("Ç¸", "Ã©");
        content = content.Replace("Ç¦", "Ãª");
        content = content.Replace("Çœ", "Ã£");
        content = content.Replace("", "Ã§");

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}

