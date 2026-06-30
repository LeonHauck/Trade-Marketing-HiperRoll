$csharp = @"
using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

public class WordFixer {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        string[] bad = new string[] {
            "NÇœo", "hÇ­", "histrico", "Observaes", "Relatrio", "ResponsÇ­vel",
            "INTELIGSNCIA", "Incio", "atÇ¸", "ComposiÇœo", "relatrio", "sltima",
            "Crtico", "notificaÇœo", "Opî¶¨î¶¨o", "segurana", "EDIî¶¨AO",
            "editÇ­veis", "mantÇ¸m", "ediÇœo", "tambÇ¸m", "memria", "sessÇœo",
            "validaÇœo", "aps", "espao", "relatÇ¸rio", "demonstraÇœo", "botÇœo",
            "reincidÇ¦ncias", "Ç§ltima", "HÇ­", "estatsticas", "padrÇœo", "ttulo",
            "Alteraes", "VocÇ¦", "estÇ­", "substituirÇœo", "inconsistÇ¦ncia",
            "PrÇ¸-preenche", "assncrono", "crtico", "resoluÇœo", "EvoluÇœo",
            "Verificao", "rpida", "esto", "nÇœo", "no", "est", "Voc", "IGNORE", 
            "at", "ja", "s", "n", "v", "j", "h", "l", "m", "t", "c", "s",
            "S", "No", "J", "H", "L", "M", "T", "C", "S", "Atraso", "Atraso",
            "Opo", "Opes", "Ao", "Aes", "edio", "edies", "validao", "validaes",
            "notificao", "notificaes", "atualizao", "atualizaes", "resoluo", "resolues",
            "observao", "observaes", "evoluo", "evolues", "composio", "composies",
            "Ao", "Aes", "Edio", "Edies", "Validao", "Validaes", "Notificao",
            "Notificaes", "Atualizao", "Atualizaes", "Resoluo", "Resolues",
            "Observao", "Observaes", "Evoluo", "Evolues", "Composio", "Composies",
            "Alterao", "Alteraes", "alterao", "alteraes", "alterao", "alteraes",
            "Histrico", "histrico", "Relatrio", "relatrio", "Usurio", "usurio",
            "Mximo", "mximo", "Mnimo", "mnimo", "ltimo", "ltimo", "nica", "nica",
            "ndice", "ndice", "rea", "rea", 
            "INTELIGÃ¯Â¿Â½SNCIA", "OpÃ¯Â¿Â½Ã¯Â¿Â½Ã¯Â¿Â½o", "EDIÃ¯Â¿Â½Ã¯Â¿Â½AO", "editÃ¯Â¿Â½veis", "mantÃ¯Â¿Â½m", "ediÃ¯Â¿Â½Ã¯Â¿Â½o",
            "tambÃ¯Â¿Â½m", "memÃ¯Â¿Â½ria", "sessÃ¯Â¿Â½o", "validaÃ¯Â¿Â½Ã¯Â¿Â½o", "apÃ¯Â¿Â½s", "espaÃ¯Â¿Â½o", "relatÃ¯Â¿Â½rio",
            "demonstraÃ¯Â¿Â½Ã¯Â¿Â½o", "botÃ¯Â¿Â½o", "reincidÃ¯Â¿Â½ncias", "Ã¯Â¿Â½ltima", "HÃ¯Â¿Â½", "estatÃ¯Â¿Â½sticas",
            "padrÃ¯Â¿Â½o", "tÃ¯Â¿Â½tulo", "AlteraÃ¯Â¿Â½es", "VocÃ¯Â¿Â½", "estÃ¯Â¿Â½", "substituirÃ¯Â¿Â½o", "inconsistÃ¯Â¿Â½ncia",
            "PrÃ¯Â¿Â½-preenche", "assÃ¯Â¿Â½ncrono", "crÃ¯Â¿Â½tico", "resoluÃ¯Â¿Â½Ã¯Â¿Â½o", "EvoluÃ¯Â¿Â½Ã¯Â¿Â½o", "VerificaÃ¯Â¿Â½o",
            "rÃ¯Â¿Â½pida", "estÃ¯Â¿Â½o", "nÃ¯Â¿Â½o", "nÃ¯Â¿Â½o", "estÃ¯Â¿Â½", "VocÃ¯Â¿Â½", "Ã¯Â¿Â½", "atÃ¯Â¿Â½", "ja", "sÃ¯Â¿Â½", "nÃ¯Â¿Â½",
            "vÃ¯Â¿Â½", "jÃ¯Â¿Â½", "hÃ¯Â¿Â½", "lÃ¯Â¿Â½", "mÃ¯Â¿Â½", "tÃ¯Â¿Â½", "cÃ¯Â¿Â½", "sÃ¯Â¿Â½", "SÃ¯Â¿Â½", "NÃ¯Â¿Â½o", "JÃ¯Â¿Â½", "HÃ¯Â¿Â½",
            "LÃ¯Â¿Â½", "MÃ¯Â¿Â½", "TÃ¯Â¿Â½", "CÃ¯Â¿Â½", "SÃ¯Â¿Â½", "OpÃ¯Â¿Â½Ã¯Â¿Â½o", "OpÃ¯Â¿Â½es", "AÃ¯Â¿Â½o", "AÃ¯Â¿Â½es", "ediÃ¯Â¿Â½o",
            "ediÃ¯Â¿Â½es", "validaÃ¯Â¿Â½o", "validaÃ¯Â¿Â½es", "notificaÃ¯Â¿Â½o", "notificaÃ¯Â¿Â½es", "atualizaÃ¯Â¿Â½o",
            "atualizaÃ¯Â¿Â½es", "resoluÃ¯Â¿Â½o", "resoluÃ¯Â¿Â½es", "observaÃ¯Â¿Â½o", "observaÃ¯Â¿Â½es", "evoluÃ¯Â¿Â½o",
            "evoluÃ¯Â¿Â½es", "composiÃ¯Â¿Â½o", "composiÃ¯Â¿Â½es", "AÃ¯Â¿Â½Ã¯Â¿Â½o", "AÃ¯Â¿Â½Ã¯Â¿Â½es", "EdiÃ¯Â¿Â½Ã¯Â¿Â½o", "EdiÃ¯Â¿Â½Ã¯Â¿Â½es",
            "ValidaÃ¯Â¿Â½Ã¯Â¿Â½o", "ValidaÃ¯Â¿Â½Ã¯Â¿Â½es", "NotificaÃ¯Â¿Â½Ã¯Â¿Â½o", "NotificaÃ¯Â¿Â½Ã¯Â¿Â½es", "AtualizaÃ¯Â¿Â½Ã¯Â¿Â½o",
            "AtualizaÃ¯Â¿Â½Ã¯Â¿Â½es", "ResoluÃ¯Â¿Â½Ã¯Â¿Â½o", "ResoluÃ¯Â¿Â½Ã¯Â¿Â½es", "ObservaÃ¯Â¿Â½Ã¯Â¿Â½o", "ObservaÃ¯Â¿Â½Ã¯Â¿Â½es",
            "EvoluÃ¯Â¿Â½Ã¯Â¿Â½o", "EvoluÃ¯Â¿Â½Ã¯Â¿Â½es", "ComposiÃ¯Â¿Â½Ã¯Â¿Â½o", "ComposiÃ¯Â¿Â½Ã¯Â¿Â½es", "AlteraÃ¯Â¿Â½Ã¯Â¿Â½o",
            "AlteraÃ¯Â¿Â½Ã¯Â¿Â½es", "alteraÃ¯Â¿Â½Ã¯Â¿Â½o", "alteraÃ¯Â¿Â½Ã¯Â¿Â½es", "alteraÃ¯Â¿Â½o", "alteraÃ¯Â¿Â½es", "HistÃ¯Â¿Â½rico",
            "histÃ¯Â¿Â½rico", "RelatÃ¯Â¿Â½rio", "relatÃ¯Â¿Â½rio", "UsuÃ¯Â¿Â½rio", "usuÃ¯Â¿Â½rio", "MÃ¯Â¿Â½ximo", "mÃ¯Â¿Â½ximo",
            "MÃ¯Â¿Â½nimo", "mÃ¯Â¿Â½nimo", "Ã¯Â¿Â½ltimo", "Ã¯Â¿Â½ltimo", "Ã¯Â¿Â½nica", "Ã¯Â¿Â½nica", "Ã¯Â¿Â½ndice", "Ã¯Â¿Â½ndice",
            "Ã¯Â¿Â½rea", "Ã¯Â¿Â½rea"
        };
        
        string[] good = new string[] {
            "NÃ£o", "hÃ¡", "histÃ³rico", "ObservaÃ§Ãµes", "RelatÃ³rio", "ResponsÃ¡vel",
            "INTELIGÃŠNCIA", "InÃ­cio", "atÃ©", "ComposiÃ§Ã£o", "relatÃ³rio", "Ãšltima",
            "CrÃ­tico", "notificaÃ§Ã£o", "OpÃ§Ã£o", "seguranÃ§a", "EDIÃ‡ÃƒO",
            "editÃ¡veis", "mantÃ©m", "ediÃ§Ã£o", "tambÃ©m", "memÃ³ria", "sessÃ£o",
            "validaÃ§Ã£o", "apÃ³s", "espaÃ§o", "relatÃ³rio", "demonstraÃ§Ã£o", "botÃ£o",
            "reincidÃªncias", "Ãºltima", "HÃ¡", "estatÃ­sticas", "padrÃ£o", "tÃ­tulo",
            "AlteraÃ§Ãµes", "VocÃª", "estÃ¡", "substituirÃ£o", "inconsistÃªncia",
            "PrÃ©-preenche", "assÃ­ncrono", "crÃ­tico", "resoluÃ§Ã£o", "EvoluÃ§Ã£o",
            "VerificaÃ§Ã£o", "rÃ¡pida", "estÃ£o", "nÃ£o", "nÃ£o", "estÃ¡", "VocÃª", "Ã©",
            "atÃ©", "jÃ¡", "sÃ³", "nÃ©", "vÃ¡", "jÃ¡", "hÃ¡", "lÃ¡", "mÃ¡", "tÃ¡", "cÃ¡", "sÃ©",
            "SÃ³", "NÃ£o", "JÃ¡", "HÃ¡", "LÃ¡", "MÃ¡", "TÃ¡", "CÃ¡", "SÃ©", "Atraso", "Atraso",
            "OpÃ§Ã£o", "OpÃ§Ãµes", "AÃ§Ã£o", "AÃ§Ãµes", "ediÃ§Ã£o", "ediÃ§Ãµes", "validaÃ§Ã£o", "validaÃ§Ãµes",
            "notificaÃ§Ã£o", "notificaÃ§Ãµes", "atualizaÃ§Ã£o", "atualizaÃ§Ãµes", "resoluÃ§Ã£o", "resoluÃ§Ãµes",
            "observaÃ§Ã£o", "observaÃ§Ãµes", "evoluÃ§Ã£o", "evoluÃ§Ãµes", "composiÃ§Ã£o", "composiÃ§Ãµes",
            "AÃ§Ã£o", "AÃ§Ãµes", "EdiÃ§Ã£o", "EdiÃ§Ãµes", "ValidaÃ§Ã£o", "ValidaÃ§Ãµes", "NotificaÃ§Ã£o",
            "NotificaÃ§Ãµes", "AtualizaÃ§Ã£o", "AtualizaÃ§Ãµes", "ResoluÃ§Ã£o", "ResoluÃ§Ãµes",
            "ObservaÃ§Ã£o", "ObservaÃ§Ãµes", "EvoluÃ§Ã£o", "EvoluÃ§Ãµes", "ComposiÃ§Ã£o", "ComposiÃ§Ãµes",
            "AlteraÃ§Ã£o", "AlteraÃ§Ãµes", "alteraÃ§Ã£o", "alteraÃ§Ãµes", "alteraÃ§Ã£o", "alteraÃ§Ãµes",
            "HistÃ³rico", "histÃ³rico", "RelatÃ³rio", "relatÃ³rio", "UsuÃ¡rio", "usuÃ¡rio",
            "MÃ¡ximo", "mÃ¡ximo", "MÃ­nimo", "mÃ­nimo", "Ãšltimo", "Ãºltimo", "Ãšnica", "Ãºnica",
            "Ãndice", "Ã­ndice", "Ãrea", "Ã¡rea", "Ã©", "Ã¡", "Ã³", "Ã­", "Ãº", "Ã§", "Ã£", "Ãµ", "Ãª",
            "INTELIGÃŠNCIA", "OpÃ§Ã£o", "EDIÃ‡ÃƒO", "editÃ¡veis", "mantÃ©m", "ediÃ§Ã£o",
            "tambÃ©m", "memÃ³ria", "sessÃ£o", "validaÃ§Ã£o", "apÃ³s", "espaÃ§o", "relatÃ³rio",
            "demonstraÃ§Ã£o", "botÃ£o", "reincidÃªncias", "Ãºltima", "HÃ¡", "estatÃ­sticas",
            "padrÃ£o", "tÃ­tulo", "AlteraÃ§Ãµes", "VocÃª", "estÃ¡", "substituirÃ£o", "inconsistÃªncia",
            "PrÃ©-preenche", "assÃ­ncrono", "crÃ­tico", "resoluÃ§Ã£o", "EvoluÃ§Ã£o", "VerificaÃ§Ã£o",
            "rÃ¡pida", "estÃ£o", "nÃ£o", "nÃ£o", "estÃ¡", "VocÃª", "Ã©", "atÃ©", "jÃ¡", "sÃ³", "nÃ©",
            "vÃ¡", "jÃ¡", "hÃ¡", "lÃ¡", "mÃ¡", "tÃ¡", "cÃ¡", "sÃ©", "SÃ³", "NÃ£o", "JÃ¡", "HÃ¡",
            "LÃ¡", "MÃ¡", "TÃ¡", "CÃ¡", "SÃ©", "OpÃ§Ã£o", "OpÃ§Ãµes", "AÃ§Ã£o", "AÃ§Ãµes", "ediÃ§Ã£o",
            "ediÃ§Ãµes", "validaÃ§Ã£o", "validaÃ§Ãµes", "notificaÃ§Ã£o", "notificaÃ§Ãµes", "atualizaÃ§Ã£o",
            "atualizaÃ§Ãµes", "resoluÃ§Ã£o", "resoluÃ§Ãµes", "observaÃ§Ã£o", "observaÃ§Ãµes", "evoluÃ§Ã£o",
            "evoluÃ§Ãµes", "composiÃ§Ã£o", "composiÃ§Ãµes", "AÃ§Ã£o", "AÃ§Ãµes", "EdiÃ§Ã£o", "EdiÃ§Ãµes",
            "ValidaÃ§Ã£o", "ValidaÃ§Ãµes", "NotificaÃ§Ã£o", "NotificaÃ§Ãµes", "AtualizaÃ§Ã£o",
            "AtualizaÃ§Ãµes", "ResoluÃ§Ã£o", "ResoluÃ§Ãµes", "ObservaÃ§Ã£o", "ObservaÃ§Ãµes",
            "EvoluÃ§Ã£o", "EvoluÃ§Ãµes", "ComposiÃ§Ã£o", "ComposiÃ§Ãµes", "AlteraÃ§Ã£o",
            "AlteraÃ§Ãµes", "alteraÃ§Ã£o", "alteraÃ§Ãµes", "alteraÃ§Ã£o", "alteraÃ§Ãµes", "HistÃ³rico",
            "histÃ³rico", "RelatÃ³rio", "relatÃ³rio", "UsuÃ¡rio", "usuÃ¡rio", "MÃ¡ximo", "mÃ¡ximo",
            "MÃ­nimo", "mÃ­nimo", "Ãšltimo", "Ãºltimo", "Ãšnica", "Ãºnica", "Ãndice", "Ã­ndice",
            "Ãrea", "Ã¡rea"
        };

        for (int i = 0; i < bad.Length; i++) {
            content = content.Replace(bad[i], good[i]);
        }
        
        // Manual one-offs
        content = content.Replace("Visitas Ç¸", "Visitas Ã ");
        content = content.Replace("lastVisit Ç¸", "lastVisit Ã©");
        content = content.Replace("Ç¸", "Ã©");

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}
"@

Add-Type -TypeDefinition $csharp -Language CSharp
[WordFixer]::Fix("C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js")
[WordFixer]::Fix("C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\index.html")
Write-Output "Words fixed"

