using Esri.ArcGISRuntime;

namespace DisplayMap;

public static class Program
{
    public static void Main()
    {
        #region api-key
        ArcGISRuntimeEnvironment.ApiKey = "YOUR_ACCESS_TOKEN"; // @var accessToken
        #endregion

        #region start
        var app = new App();
        app.Run();
        #endregion start
    }
}
