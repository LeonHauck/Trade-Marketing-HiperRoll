using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

public class FinalStripper {
    public static void Fix(string file) {
        if (!File.Exists(file)) return;
        string content = File.ReadAllText(file, Encoding.UTF8);

        // Strip the garbage characters
        string pattern = "[\u01DF\uFFFD\u01ED\u01F8\u01E6\u01DC\u01FD]";
        content = Regex.Replace(content, pattern, "");

        // Also fix the words that were corrupted in the first place
        string[] badWords = new string[] {
            "histrico", "Observaes", "Relatrio", "Responsvel",
            "INTELIGSNCIA", "Incio", "Composio", "relatrio", "sltima",
            "Crtico", "notificao", "Opo", "segurana", "EDICAO",
            "editveis", "mantm", "edio", "tambm", "memria", "sesso",
            "validao", "aps", "espao", "demonstrao", "boto",
            "reincidncias", "estatsticas", "padro", "ttulo",
            "Alteraes", "substituiro", "inconsistncia",
            "Pr-preenche", "assncrono", "crtico", "resoluo", "Evoluo",
            "Verificao", "rpida", "Resoluo", "atualizao", "Atraso",
            "Nao", "Voc", "ja"
        };
        
        string[] goodWords = new string[] {
            "histórico", "Observações", "Relatório", "Responsável",
            "INTELIGÊNCIA", "Início", "Composição", "relatório", "última",
            "Crítico", "notificação", "Opção", "segurança", "EDIÇÃO",
            "editáveis", "mantém", "edição", "também", "memória", "sessão",
            "validação", "após", "espaço", "demonstração", "botão",
            "reincidências", "estatísticas", "padrão", "título",
            "Alterações", "substituirão", "inconsistência",
            "Pré-preenche", "assíncrono", "crítico", "resolução", "Evolução",
            "Verificação", "rápida", "Resolução", "atualização", "Atraso",
            "Não", "Você", "já"
        };
        
        for (int i = 0; i < badWords.Length; i++) {
            content = content.Replace(badWords[i], goodWords[i]);
        }

        File.WriteAllText(file, content, new UTF8Encoding(false));
    }
}
