/**
 * Created by mihaisandor on 2/27/17.
 */
var terp = new Flappy();

terp.addWords(PrintingWords);
terp.addWords(MathWords);
terp.addWords(StackWords);
terp.addWords(VariableWords);
terp.addWords(ConstantWords);
terp.addWords(StringWords);
terp.addWords(CommentWords);
terp.addWords(CompilingWords);
terp.addWords(ListWords);
terp.addWords(ControlWords);
terp.addWords(LogicWords);
terp.addWords(CompareWords);

window.onload = function () {
  var cmdline = document.getElementById("cmdline");
  var stack_view = document.getElementById("stack-view");
  document.getElementById("runcmd").onclick = function () {
    try {
      terp.run(cmdline.value);
    } catch (e) {
      alert(e);
    }
    stack_view.innerHTML = terp.stack;
  }
};

