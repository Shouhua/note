## 问题
```csharp
using System.Text;

public static Main() {
	for (;;)
	{
			var line = Console.ReadLine();
			var b = Encoding.UTF8.GetBytes(line);
			Console.WriteLine("raw input: {0}", Encoding.UTF8.GetString(b));
	}
}
```
在Rider编辑器中运行后，输入”龙“，不能正确显示。[NetCoreServer](https://github.com/chronoxor/NetCoreServer)中Tcp例子中输入中文跟上述问题类似，输入中文，server和client都显示乱码。
## 原因
1. 首先需要了解的是，dotnet使用UTF16编码方式存储字符(char)或者字符串(string)，System.Text.Encoding.Unicode表示UTF16编解码，一个字符默认使用2个字节存储，如果遇到少数的语言文字，需要使用多个16bits配合表示。默认情况下Console的InputEncoding和OutputEncoding使用本地的默认方式UTF8，所以，使用UTF8显示UTF16编码字符，显示乱码。解决方法是设置相应的值为Unicode(UTF16)。
[Character encoding in .NET](https://docs.microsoft.com/en-us/dotnet/standard/base-types/character-encoding-introduction#endianness), 文章讲述很清晰了，需要耐心，讲述了存储、表示方式以及注意事项。
2. 上面可以解决乱码问题，有一点需要注意就是NetCoreServer中，传输的Bytes是编码UTF16字符，比如“龙”的UTF16字符是“0x9F99”，使用UTF8编码后是“0xE9BE99”，然后传输到达后，在根据设置的编码方式显示。